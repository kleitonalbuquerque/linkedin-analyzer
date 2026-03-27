import { beforeEach, describe, expect, it, vi } from "vitest";

const { groqCreateMock } = vi.hoisted(() => ({
  groqCreateMock: vi.fn(),
}));

vi.mock("groq-sdk", () => ({
  default: function GroqMock() {
    this.chat = {
      completions: {
        create: groqCreateMock,
      },
    };
  },
}));

import {
  analyzeLinkedInProfile,
  buildBenchmark,
  buildFallbackResponse,
  buildGroqPrompt,
  buildPontosFortes,
  buildPontosFracos,
  buildProblemas,
  buildRuleBasedAnalysis,
  clampScore,
  createGroqClient,
  countKeywordHits,
  countMatches,
  countMeasuredResults,
  determineFoco,
  determineNivel,
  extractJsonBlock,
  generateGroqAnalysis,
  normalizeProfile,
  pushIfMissing,
  sanitizeList,
  sanitizeModelText,
  scoreExperiences,
  scoreHeadline,
  scoreKeywords,
  scoreMeasuredResults,
} from "./aiService.js";

describe("aiService helpers", () => {
  beforeEach(() => {
    groqCreateMock.mockReset();
  });

  it("normalizes profile fields", () => {
    expect(
      normalizeProfile({
        name: "  Kleiton  ",
        headline: "  Backend Engineer  ",
        experiences: ["  Liderou API  ", "", 123],
      }),
    ).toEqual({
      name: "Kleiton",
      headline: "Backend Engineer",
      experiences: ["Liderou API", "123"],
    });
  });

  it("scores headline, keywords, experiences and metrics", () => {
    expect(scoreHeadline(120)).toBe(20);
    expect(scoreHeadline(50)).toBe(12);
    expect(scoreHeadline(10)).toBe(5);
    expect(scoreKeywords(5)).toBe(20);
    expect(scoreKeywords(3)).toBe(14);
    expect(scoreKeywords(1)).toBe(8);
    expect(scoreExperiences(5)).toBe(20);
    expect(scoreExperiences(3)).toBe(14);
    expect(scoreExperiences(1)).toBe(8);
    expect(scoreMeasuredResults(3)).toBe(15);
    expect(scoreMeasuredResults(1)).toBe(8);
  });

  it("clamps scores within 0 and 100", () => {
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(150)).toBe(100);
    expect(clampScore(74.6)).toBe(75);
  });

  it("counts keyword and measured-result signals", () => {
    expect(countKeywordHits("React Node SQL")).toBe(3);
    expect(
      countMatches("lideranca e mentoria", ["lideranca", "mentoria"]),
    ).toBe(2);
    expect(
      countMeasuredResults([
        "Aumentei MRR em 20%",
        "Liderei equipe",
        "Atendi 200 clientes",
      ]),
    ).toBe(2);
  });

  it("detects level and focus", () => {
    expect(determineNivel(90, 5, 0)).toBe("Senior");
    expect(determineNivel(90, 2, 2)).toBe("Pleno");
    expect(determineNivel(70, 2, 0)).toBe("Pleno");
    expect(determineNivel(40, 1, 0)).toBe("Junior");
    expect(determineFoco("react css ui frontend")).toBe("Frontend");
    expect(determineFoco("roadmap discovery growth stakeholders")).toBe(
      "Produto",
    );
    expect(determineFoco("texto generico")).toBe("Generalista");
  });

  it("builds strengths, weaknesses and problems lists without duplicates", () => {
    const pontosFortes = buildPontosFortes({
      foco: "Backend",
      keywordHits: 4,
      measuredResults: 1,
      experiencesCount: 3,
      leadershipHits: 1,
    });
    const pontosFracos = buildPontosFracos({
      keywordHits: 1,
      measuredResults: 0,
      experiencesCount: 1,
      leadershipHits: 0,
    });
    const problemas = buildProblemas({
      headlineLength: 10,
      keywordHits: 1,
      measuredResults: 0,
      experiencesCount: 1,
      leadershipHits: 0,
    });

    expect(pontosFortes).toContain("Backend");
    expect(pontosFracos).toContain("Palavras-chave insuficientes");
    expect(problemas).toContain("Headline generica ou curta demais.");

    const list = [];
    pushIfMissing(list, "item");
    pushIfMissing(list, "item");
    expect(list).toEqual(["item"]);
  });

  it("builds benchmark ranges", () => {
    expect(buildBenchmark(90)).toContain("Acima da media");
    expect(buildBenchmark(75)).toContain("Bom posicionamento");
    expect(buildBenchmark(60)).toContain("Na media do mercado");
    expect(buildBenchmark(30)).toContain("Abaixo da media");
  });

  it("builds a deterministic rule-based analysis", () => {
    const result = buildRuleBasedAnalysis({
      name: "Kleiton",
      headline:
        "Senior Backend Engineer com Node, SQL e Azure em produtos SaaS",
      experiences: [
        "Liderei API com Node.js e SQL, reduzindo custos em 20%.",
        "Coordenei squad e melhorei KPI de conversao em 15%.",
        "Implementei microsservicos e Docker para 200 clientes.",
      ],
    });

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.nivel).toBe("Pleno");
    expect(result.foco).toBe("Backend");
    expect(result.sugestoes).toHaveLength(4);
    expect(result.signals.keywordHits).toBeGreaterThanOrEqual(3);
  });

  it("builds a low-signal analysis for junior profiles", () => {
    const result = buildRuleBasedAnalysis({
      name: "",
      headline: "Designer",
      experiences: ["Atuei no time"],
    });

    expect(result.nivel).toBe("Junior");
    expect(result.score).toBeLessThan(65);
    expect(result.problemas.length).toBeGreaterThan(0);
    expect(result.pontosFracos.length).toBeGreaterThan(0);
  });

  it("extracts and sanitizes model responses", () => {
    expect(extractJsonBlock('```json\n{"ok": true}\n```\ntexto')).toBe(
      '{"ok": true}',
    );
    expect(extractJsonBlock('antes {"ok": true} depois')).toBe('{"ok": true}');
    expect(
      sanitizeModelText("&R&e&s&u&m&o&: &P&e&r&f&i&l &c&o&m&p&e&t&i&t&i&v&o.&"),
    ).toBe("Resumo: Perfil competitivo.");
    expect(
      sanitizeList(["  A  ", "", "B", "C", "D", "E"], ["fallback"]),
    ).toEqual(["A", "B", "C", "D"]);
    expect(
      sanitizeList(["&1&.& &D&e&t&a&l&h&e &m&e&l&h&o&r.&", ""], ["fallback"]),
    ).toEqual(["1. Detalhe melhor."]);
    expect(sanitizeList(null, ["fallback"])).toEqual(["fallback"]);
  });

  it("builds fallback response from base analysis", () => {
    const baseAnalysis = buildRuleBasedAnalysis({
      name: "Kleiton",
      headline: "Backend com Node e SQL",
      experiences: ["Criei APIs para 50 clientes"],
    });

    expect(buildFallbackResponse(baseAnalysis)).toMatchObject({
      provider: "local-fallback",
      score: baseAnalysis.score,
      foco: baseAnalysis.foco,
    });
  });

  it("builds a prompt with local context", () => {
    const baseAnalysis = buildRuleBasedAnalysis({
      name: "Kleiton",
      headline: "Backend com Node e SQL",
      experiences: ["Criei APIs para 50 clientes"],
    });

    const prompt = buildGroqPrompt(
      {
        name: "Kleiton",
        headline: "Backend com Node e SQL",
        experiences: ["Criei APIs"],
      },
      baseAnalysis,
    );

    expect(prompt).toContain("Score local");
    expect(prompt).toContain("Resumo local");
    expect(prompt).toContain("Nome: Kleiton");
  });

  it("returns null client when GROQ key is missing", () => {
    vi.stubEnv("GROQ_API_KEY", "");

    expect(createGroqClient()).toBeNull();

    vi.unstubAllEnvs();
  });

  it("returns null when generateGroqAnalysis has no configured client", async () => {
    vi.stubEnv("GROQ_API_KEY", "");

    const baseAnalysis = buildRuleBasedAnalysis({
      name: "Kleiton",
      headline: "Backend com Node e SQL",
      experiences: ["Criei APIs para 50 clientes"],
    });

    await expect(
      generateGroqAnalysis(
        {
          name: "Kleiton",
          headline: "Backend com Node e SQL",
          experiences: [],
        },
        baseAnalysis,
      ),
    ).resolves.toBeNull();

    vi.unstubAllEnvs();
  });
});

describe("analyzeLinkedInProfile", () => {
  beforeEach(() => {
    groqCreateMock.mockReset();
  });

  it("returns fallback provider when GROQ key is missing", async () => {
    vi.stubEnv("GROQ_API_KEY", "");

    const result = await analyzeLinkedInProfile({
      name: "Kleiton",
      headline: "Backend com Node e SQL",
      experiences: ["Criei APIs para 50 clientes"],
    });

    expect(result.provider).toBe("local-fallback");
    expect(result.score).toBeGreaterThan(0);

    vi.unstubAllEnvs();
  });

  it("uses Groq response when available", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");

    groqCreateMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              nivel: "Senior",
              foco: "Dados",
              pontosFortes: ["Especializacao"],
              pontosFracos: ["Poucas metricas"],
              problemas: ["Resumo generico"],
              sugestoes: ["Detalhe mais os numeros"],
              benchmark: "Acima da media.",
              resumo: "Perfil competitivo.",
            }),
          },
        },
      ],
    });

    const result = await analyzeLinkedInProfile({
      name: "Kleiton",
      headline: "Backend com Node e SQL",
      experiences: ["Criei APIs para 50 clientes"],
    });

    expect(groqCreateMock).toHaveBeenCalled();
    expect(result.provider).toContain("groq:");
    expect(result.foco).toBe("Dados");
    expect(result.nivel).toBe("Senior");

    vi.unstubAllEnvs();
  });

  it("falls back to local values when Groq returns incomplete fields", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");

    groqCreateMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              nivel: "Especialista",
              foco: "",
              pontosFortes: [],
              pontosFracos: [],
              problemas: [],
              sugestoes: [],
              benchmark: "",
              resumo: "",
            }),
          },
        },
      ],
    });

    const profile = {
      name: "Kleiton",
      headline: "Backend com Node e SQL",
      experiences: ["Criei APIs para 50 clientes"],
    };
    const baseAnalysis = buildRuleBasedAnalysis(normalizeProfile(profile));
    const result = await generateGroqAnalysis(profile, baseAnalysis);

    expect(result.nivel).toBe(baseAnalysis.nivel);
    expect(result.foco).toBe(baseAnalysis.foco);
    expect(result.pontosFortes).toEqual(baseAnalysis.pontosFortes);
    expect(result.benchmark).toBe(baseAnalysis.benchmark);

    vi.unstubAllEnvs();
  });

  it("sanitizes broken ampersand-encoded Groq fields", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");

    groqCreateMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              nivel: "Pleno",
              foco: "Frontend",
              pontosFortes: ["&1&.& &R&e&a&c&t&"],
              pontosFracos: ["&2&.& &S&e&m &m&e&t&r&i&c&a&s&"],
              problemas: ["&3&.& &H&e&a&d&l&i&n&e &g&e&n&e&r&i&c&a&"],
              sugestoes: ["&4&.& &A&d&i&c&i&o&n&e &n&u&m&e&r&o&s&"],
              benchmark: "&B&o&m &p&o&s&i&c&i&o&n&a&m&e&n&t&o&.&",
              resumo: "&R&e&s&u&m&o&: &P&e&r&f&i&l &c&o&m&p&e&t&i&t&i&v&o&.",
            }),
          },
        },
      ],
    });

    const result = await analyzeLinkedInProfile({
      name: "Kleiton",
      headline: "Backend com Node e SQL",
      experiences: ["Criei APIs para 50 clientes"],
    });

    expect(result.pontosFortes).toEqual(["1. React"]);
    expect(result.pontosFracos).toEqual(["2. Sem metricas"]);
    expect(result.problemas).toEqual(["3. Headline generica"]);
    expect(result.sugestoes).toEqual(["4. Adicione numeros"]);
    expect(result.benchmark).toBe("Bom posicionamento.");
    expect(result.resumo).toBe("Resumo: Perfil competitivo.");

    vi.unstubAllEnvs();
  });

  it("throws when Groq returns an empty message", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");

    groqCreateMock.mockResolvedValue({
      choices: [{ message: { content: "" } }],
    });

    const baseAnalysis = buildRuleBasedAnalysis({
      name: "Kleiton",
      headline: "Backend com Node e SQL",
      experiences: ["Criei APIs para 50 clientes"],
    });

    await expect(
      generateGroqAnalysis(
        {
          name: "Kleiton",
          headline: "Backend com Node e SQL",
          experiences: ["Criei APIs para 50 clientes"],
        },
        baseAnalysis,
      ),
    ).rejects.toThrow("Groq returned an empty response");

    vi.unstubAllEnvs();
  });
});
