import { afterEach, describe, expect, it, vi } from "vitest";

import {
  analyzeActiveProfile,
  BrowserPdfDocument,
  buildPdfFileName,
  exportAnalysisPdf,
  formatAnalysisProvider,
  getProfileCaptureError,
  getProfileCaptureNotice,
  getProfileFromActiveTab,
  hasProfileData,
  isLikelyExternalHeadline,
  isSuspiciousProfileHeadline,
  isLinkedInProfileUrl,
  reportClientError,
  type AnalysisResult,
  type ChromeApi,
} from "./analyzer";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

function createChromeApi(overrides: Partial<ChromeApi> = {}): ChromeApi {
  return {
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 10, url: "https://www.linkedin.com/in/teste" }]),
      sendMessage: vi.fn().mockResolvedValue({
        name: "Kleiton",
        headline: "Backend Engineer",
        experiences: ["Criei APIs em Node.js"],
      }),
      ...overrides.tabs,
    },
  };
}

function createAnalysis(): AnalysisResult {
  return {
    nivel: "Pleno",
    score: 82,
    foco: "Backend",
    pontosFortes: ["Boa densidade de palavras-chave"],
    pontosFracos: ["Falta de metricas de impacto"],
    problemas: ["Sem metricas claras de impacto nas experiencias."],
    benchmark: "Bom posicionamento para o mercado.",
    resumo: "Resumo objetivo.",
    sugestoes: ["Inclua resultados com numeros."],
    provider: "local-fallback",
  };
}

describe("analyzer helpers", () => {
  it("recognizes LinkedIn profile URLs and profile data", () => {
    expect(isLinkedInProfileUrl("https://www.linkedin.com/in/teste")).toBe(true);
    expect(isLinkedInProfileUrl("https://www.linkedin.com/company/teste")).toBe(false);
    expect(hasProfileData({ headline: "Backend Engineer" })).toBe(true);
    expect(hasProfileData({ experiences: ["Projeto"] })).toBe(true);
    expect(hasProfileData({})).toBe(false);
    expect(isLikelyExternalHeadline()).toBe(false);
    expect(isSuspiciousProfileHeadline("LIVE")).toBe(true);
    expect(isSuspiciousProfileHeadline("me ajudou a conseguir este emprego")).toBe(true);
    expect(isSuspiciousProfileHeadline("Gabriel Andrade e mais 2 pessoas")).toBe(true);
    expect(isSuspiciousProfileHeadline("Eduardo Sabino e mais 1.078 pessoas")).toBe(true);
    expect(isSuspiciousProfileHeadline("Eduardo Sabino e mais 1,078 pessoas")).toBe(true);
    expect(isSuspiciousProfileHeadline("2 mutual connections")).toBe(true);
    expect(isSuspiciousProfileHeadline("SRE Pleno (SP16101308)")).toBe(true);
    expect(isSuspiciousProfileHeadline("1 comentário")).toBe(true);
    expect(isSuspiciousProfileHeadline("A sociedade do desempenho, o ego e os adultos infantilizados no poder - Migalhas")).toBe(true);
    expect(isSuspiciousProfileHeadline('Por Que "Soft Skills" Não Significa Nada E O Que Usar no Lugar')).toBe(true);
    expect(isSuspiciousProfileHeadline("Backend Engineer")).toBe(false);
    expect(isLikelyExternalHeadline("me ajudou a conseguir este emprego")).toBe(true);
    expect(isLikelyExternalHeadline("Gabriel Andrade e mais 2 pessoas")).toBe(true);
    expect(isLikelyExternalHeadline("Eduardo Sabino e mais 1.078 pessoas")).toBe(true);
    expect(isLikelyExternalHeadline("Eduardo Sabino e mais 1,078 pessoas")).toBe(true);
    expect(isLikelyExternalHeadline("2 mutual connections")).toBe(true);
    expect(isLikelyExternalHeadline("SRE Pleno (SP16101308)")).toBe(true);
    expect(isLikelyExternalHeadline("A sociedade do desempenho, o ego e os adultos infantilizados no poder - Migalhas")).toBe(true);
    expect(isLikelyExternalHeadline('Por Que "Soft Skills" Não Significa Nada E O Que Usar no Lugar')).toBe(true);
    expect(isLikelyExternalHeadline("Como escalar plataformas: lições práticas para engenharia moderna")).toBe(true);
    expect(isLikelyExternalHeadline("How to scale Node.js APIs in production as a Backend Engineer")).toBe(false);
    expect(formatAnalysisProvider("local-fallback")).toBe("Análise local");
    expect(formatAnalysisProvider("groq:openai/gpt-oss-120b")).toContain("IA (Groq");
    expect(formatAnalysisProvider()).toBe("Não informado");
    expect(formatAnalysisProvider("custom-provider")).toBe("custom-provider");
    expect(
      getProfileCaptureError(
        { name: "Kleiton", headline: "1 comentário", experiences: ["Projeto"] },
        "https://www.linkedin.com/in/teste/details/featured/",
      ),
    ).toContain("capturado metadados da página ou um título externo");
    expect(
      getProfileCaptureError(
        { name: "Kleiton", headline: "Software Engineer", experiences: ["Projeto 1", "Projeto 2"] },
        "https://www.linkedin.com/in/teste/",
      ),
    ).toBeNull();
    expect(
      getProfileCaptureError(
        { name: "Kleiton", headline: "", experiences: ["Projeto resumido"] },
        "https://www.linkedin.com/in/teste/",
      ),
    ).toContain("headline");
    expect(
      getProfileCaptureError(
        {
          name: "Kleiton",
          headline: "",
          experiences: ["Projeto 1 com React e Node.js", "Projeto 2 com Java e integrações"],
        },
        "https://www.linkedin.com/in/teste/details/experience/",
      ),
    ).toBeNull();
    expect(
      getProfileCaptureNotice(
        {
          name: "Kleiton",
          headline: "",
          experiences: ["Projeto 1 com React e Node.js", "Projeto 2 com Java e integrações"],
        },
        "https://www.linkedin.com/in/teste/details/experience/",
      ),
    ).toContain("experiências completas");
    expect(
      getProfileCaptureError(
        {
          name: "Kleiton",
          headline: "Software Engineer",
          experiences: ["Projeto resumido"],
          hasMoreExperienceDetails: true,
        },
        "https://www.linkedin.com/in/teste/",
      ),
    ).toBeNull();
    expect(
      getProfileCaptureNotice(
        {
          name: "Kleiton",
          headline: "Software Engineer",
          experiences: ["Projeto resumido"],
          hasMoreExperienceDetails: true,
        },
        "https://www.linkedin.com/in/teste/",
      ),
    ).toContain("Todas as experiências");
    expect(
      getProfileCaptureNotice(
        {
          name: "Kleiton",
          headline: "Software Engineer",
          experiences: ["Projeto resumido"],
          hasMoreExperienceDetails: true,
        },
        "https://www.linkedin.com/in/teste/details/experience/",
      ),
    ).toBeNull();
    expect(
      getProfileCaptureError(
        { name: "Kleiton", headline: "Software Engineer", experiences: ["Projeto resumido"] },
        "https://www.linkedin.com/in/teste/details/experience/",
      ),
    ).toBeNull();
  });

  it("asks for a tab refresh when the active content script is stale", () => {
    vi.stubGlobal("chrome", {
      runtime: {
        getManifest: () => ({ version: "1.0.3" }),
      },
    });

    expect(
      getProfileCaptureError(
        { name: "Kleiton", headline: "Software Engineer", experiences: ["Projeto"] },
        "https://www.linkedin.com/in/teste/",
      ),
    ).toContain("versão antiga");

    vi.unstubAllGlobals();
  });

  it("builds a normalized PDF filename with fallback", () => {
    expect(buildPdfFileName({ name: "Kleiton Albuquerque" })).toBe("kleiton-albuquerque");
    expect(buildPdfFileName({ name: "---" })).toBe("linkedin-profile");
    expect(buildPdfFileName(null)).toBe("linkedin-profile");
  });
});

describe("getProfileFromActiveTab", () => {
  it("returns the profile when the content script is ready", async () => {
    const chromeApi = createChromeApi();

    await expect(getProfileFromActiveTab(10, chromeApi)).resolves.toEqual({
      name: "Kleiton",
      headline: "Backend Engineer",
      experiences: ["Criei APIs em Node.js"],
    });

    expect(chromeApi.tabs.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("retries until the content script becomes available", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 10, url: "https://www.linkedin.com/in/teste" }]),
        sendMessage: vi
          .fn()
          .mockRejectedValueOnce(new Error("Could not establish connection. Receiving end does not exist."))
          .mockResolvedValueOnce({
            name: "Kleiton",
            headline: "Backend Engineer",
            experiences: ["Criei APIs em Node.js"],
          }),
      },
    });
    const sleepImpl = vi.fn().mockResolvedValue(undefined);

    await expect(getProfileFromActiveTab(10, chromeApi, { sleepImpl })).resolves.toEqual({
      name: "Kleiton",
      headline: "Backend Engineer",
      experiences: ["Criei APIs em Node.js"],
    });

    expect(chromeApi.tabs.sendMessage).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledTimes(1);
  });

  it("asks the user to refresh the page when the content script is unavailable after retries", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 10, url: "https://www.linkedin.com/in/teste" }]),
        sendMessage: vi.fn().mockRejectedValue(new Error("Could not establish connection. Receiving end does not exist.")),
      },
    });
    const sleepImpl = vi.fn().mockResolvedValue(undefined);

    await expect(getProfileFromActiveTab(10, chromeApi, { maxRetries: 2, sleepImpl })).rejects.toThrow(
      "Atualize a aba do LinkedIn aberta e tente novamente.",
    );

    expect(chromeApi.tabs.sendMessage).toHaveBeenCalledTimes(3);
    expect(sleepImpl).toHaveBeenCalledTimes(2);
  });
});

describe("analyzeActiveProfile", () => {
  it("returns profile and analysis on success", async () => {
    const chromeApi = createChromeApi();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(createAnalysis()),
    });

    const result = await analyzeActiveProfile({
      chromeApi,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      apiBaseUrl: "https://api.example.com",
    });

    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.com/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Kleiton",
        headline: "Backend Engineer",
        experiences: ["Criei APIs em Node.js"],
      }),
    });
    expect(result.analysis.score).toBe(82);
    expect(result.profile.name).toBe("Kleiton");
  });

  it("normalizes decomposed unicode before sending the profile to the backend", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 10, url: "https://www.linkedin.com/in/teste" }]),
        sendMessage: vi.fn().mockResolvedValue({
          name: "Kleiton Na\u0303o",
          headline: "Backend com integraça\u0303o",
          experiences: ["Atuaça\u0303o com Node.js"],
        }),
      },
    });
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(createAnalysis()),
    });

    const result = await analyzeActiveProfile({
      chromeApi,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      apiBaseUrl: "https://api.example.com",
    });

    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.com/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Kleiton Não",
        headline: "Backend com integração",
        experiences: ["Atuação com Node.js"],
      }),
    });
    expect(result.profile).toEqual({
      name: "Kleiton Não",
      headline: "Backend com integração",
      experiences: ["Atuação com Node.js"],
    });
  });

  it("fails when there is no active tab", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([{}]),
        sendMessage: vi.fn(),
      },
    });

    await expect(analyzeActiveProfile({ chromeApi })).rejects.toThrow("Nenhuma aba ativa encontrada.");
  });

  it("fails when the active tab is not a LinkedIn profile", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 10, url: "https://example.com" }]),
        sendMessage: vi.fn(),
      },
    });

    await expect(analyzeActiveProfile({ chromeApi })).rejects.toThrow("Abra um perfil do LinkedIn antes de analisar.");
  });

  it("fails when the captured profile is empty", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 10, url: "https://www.linkedin.com/in/teste" }]),
        sendMessage: vi.fn().mockResolvedValue({ name: "Kleiton", experiences: [] }),
      },
    });

    await expect(analyzeActiveProfile({ chromeApi })).rejects.toThrow("Não foi possível capturar os dados do perfil exibido.");
  });

  it("fails when the captured headline is empty", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 10, url: "https://www.linkedin.com/in/teste" }]),
        sendMessage: vi.fn().mockResolvedValue({
          name: "Kleiton",
          headline: "",
          experiences: ["Projeto com React e Node.js"],
        }),
      },
    });

    await expect(analyzeActiveProfile({ chromeApi })).rejects.toThrow("Não consegui capturar a headline do perfil.");
  });

  it("falls back to the profile name for headline cache lookup when the profile slug is missing", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 10, url: "https://www.linkedin.com/in/" }]),
        sendMessage: vi.fn().mockResolvedValue({
          name: "Kleiton",
          headline: "",
          experiences: ["Projeto com React e Node.js"],
        }),
      },
    });

    await expect(analyzeActiveProfile({ chromeApi })).rejects.toThrow("Não consegui capturar a headline do perfil.");
  });

  it("handles invalid cached headline data as an empty cache", async () => {
    localStorage.setItem("linkedinAnalyzerProfileHeadlineCache", "{invalid-json");
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 10, url: "https://www.linkedin.com/in/" }]),
        sendMessage: vi.fn().mockResolvedValue({
          name: "",
          headline: "",
          experiences: ["Projeto com React e Node.js"],
        }),
      },
    });

    await expect(analyzeActiveProfile({ chromeApi })).rejects.toThrow("Não consegui capturar a headline do perfil.");
  });

  it("uses a cached headline when analyzing the full experience details page", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(createAnalysis()),
    });

    await analyzeActiveProfile({
      chromeApi: createChromeApi(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      apiBaseUrl: "https://api.example.com",
    });

    const detailsChromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([
          { id: 10, url: "https://www.linkedin.com/in/teste/details/experience/" },
        ]),
        sendMessage: vi.fn().mockResolvedValue({
          name: "Kleiton",
          headline: "",
          experiences: [
            "Experiência 1 com React e Java em produto corporativo.",
            "Experiência 2 com Next.js e SEO técnico no setor educacional.",
            "Experiência 3 com Node.js em serviços transacionais.",
          ],
        }),
      },
    });

    await analyzeActiveProfile({
      chromeApi: detailsChromeApi,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      apiBaseUrl: "https://api.example.com",
    });

    const [, secondCallOptions] = fetchImpl.mock.calls[1];
    const sentProfile = JSON.parse(String(secondCallOptions?.body));

    expect(sentProfile).toEqual({
      name: "Kleiton",
      headline: "Backend Engineer",
      experiences: [
        "Experiência 1 com React e Java em produto corporativo.",
        "Experiência 2 com Next.js e SEO técnico no setor educacional.",
        "Experiência 3 com Node.js em serviços transacionais.",
      ],
    });
  });

  it("infers a headline from the current role on the full experience details page", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([
          { id: 10, url: "https://www.linkedin.com/in/teste/details/experience/" },
        ]),
        sendMessage: vi.fn().mockResolvedValue({
          name: "Kleiton",
          headline: "",
          experiences: [
            "Fullstack Developer | UX Especialist | Mirante Tecnologia | Tempo integral | out de 2024 - o momento | Atuo no desenvolvimento de aplicações web com React e Java.",
            "Analista de sistemas | YDUQS | jun de 2022 - set de 2024 | Desenvolvi aplicações com Next.js e Node.js.",
            "Software Developer | Qualicorp | nov de 2021 - fev de 2023 | Desenvolvi APIs em Node.js.",
          ],
        }),
      },
    });
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(createAnalysis()),
    });

    await analyzeActiveProfile({
      chromeApi,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      apiBaseUrl: "https://api.example.com",
    });

    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.com/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Kleiton",
        headline: "Fullstack Developer | UX Especialist",
        experiences: [
          "Fullstack Developer | UX Especialist | Mirante Tecnologia | Tempo integral | out de 2024 - o momento | Atuo no desenvolvimento de aplicações web com React e Java.",
          "Analista de sistemas | YDUQS | jun de 2022 - set de 2024 | Desenvolvi aplicações com Next.js e Node.js.",
          "Software Developer | Qualicorp | nov de 2021 - fev de 2023 | Desenvolvi APIs em Node.js.",
        ],
      }),
    });
  });

  it("analyzes the full experience details page even when the headline cannot be inferred", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([
          { id: 10, url: "https://www.linkedin.com/in/teste/details/experience/" },
        ]),
        sendMessage: vi.fn().mockResolvedValue({
          name: "Kleiton",
          headline: "",
          experiences: [
            "Atuação relevante em integrações críticas.",
            "Entrega de sistemas web com manutenção e sustentação.",
          ],
        }),
      },
    });
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(createAnalysis()),
    });

    const result = await analyzeActiveProfile({
      chromeApi,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      apiBaseUrl: "https://api.example.com",
    });

    expect(result.notice).toContain("experiências completas");
    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.com/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Kleiton",
        headline: "",
        experiences: [
          "Atuação relevante em integrações críticas.",
          "Entrega de sistemas web com manutenção e sustentação.",
        ],
      }),
    });
  });

  it("fails when the captured headline looks like page metadata", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([
          { id: 10, url: "https://www.linkedin.com/in/teste/details/featured/" },
        ]),
        sendMessage: vi.fn().mockResolvedValue({
          name: "Kleiton",
          headline: "1 comentário",
          experiences: ["Resumo do perfil"],
        }),
      },
    });

    await expect(analyzeActiveProfile({ chromeApi })).rejects.toThrow(
      "O LinkedIn parece ter capturado metadados da página ou um título externo em vez da headline do perfil.",
    );
  });

  it("fails when the captured headline is the LinkedIn LIVE badge", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([
          { id: 10, url: "https://www.linkedin.com/in/teste/details/featured/" },
        ]),
        sendMessage: vi.fn().mockResolvedValue({
          name: "Kleiton",
          headline: "LIVE",
          experiences: ["Resumo do perfil", "Projeto 1"],
        }),
      },
    });

    await expect(analyzeActiveProfile({ chromeApi })).rejects.toThrow(
      "O LinkedIn parece ter capturado metadados da página ou um título externo em vez da headline do perfil.",
    );
  });

  it("fails when the captured headline is a LinkedIn social-proof badge", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([
          { id: 10, url: "https://www.linkedin.com/in/teste/details/featured/" },
        ]),
        sendMessage: vi.fn().mockResolvedValue({
          name: "Kleiton",
          headline: "me ajudou a conseguir este emprego",
          experiences: ["Resumo do perfil", "Projeto 1"],
        }),
      },
    });

    await expect(analyzeActiveProfile({ chromeApi })).rejects.toThrow(
      "O LinkedIn parece ter capturado metadados da página ou um título externo em vez da headline do perfil.",
    );
  });

  it("fails when the captured headline looks like a job posting title", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([
          { id: 10, url: "https://www.linkedin.com/in/teste/details/featured/" },
        ]),
        sendMessage: vi.fn().mockResolvedValue({
          name: "Kleiton",
          headline: "SRE Pleno (SP16101308)",
          experiences: ["Resumo do perfil", "Projeto 1"],
        }),
      },
    });

    await expect(analyzeActiveProfile({ chromeApi })).rejects.toThrow(
      "O LinkedIn parece ter capturado metadados da página ou um título externo em vez da headline do perfil.",
    );
  });

  it("fails when the captured headline looks like an external article title", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([
          { id: 10, url: "https://www.linkedin.com/in/teste/details/featured/" },
        ]),
        sendMessage: vi.fn().mockResolvedValue({
          name: "Kleiton",
          headline: "A sociedade do desempenho, o ego e os adultos infantilizados no poder - Migalhas",
          experiences: ["Resumo do perfil", "Projeto 1"],
        }),
      },
    });

    await expect(analyzeActiveProfile({ chromeApi })).rejects.toThrow(
      "O LinkedIn parece ter capturado metadados da página ou um título externo em vez da headline do perfil.",
    );
  });

  it("fails when the captured headline starts with a Portuguese editorial prefix", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([
          { id: 10, url: "https://www.linkedin.com/in/teste/details/featured/" },
        ]),
        sendMessage: vi.fn().mockResolvedValue({
          name: "Kleiton",
          headline: 'Por Que "Soft Skills" Não Significa Nada E O Que Usar no Lugar',
          experiences: ["Resumo do perfil", "Projeto 1"],
        }),
      },
    });

    await expect(analyzeActiveProfile({ chromeApi })).rejects.toThrow(
      "O LinkedIn parece ter capturado metadados da página ou um título externo em vez da headline do perfil.",
    );
  });

  it("fails when the LinkedIn details page capture is incomplete", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([
          { id: 10, url: "https://www.linkedin.com/in/teste/details/featured/" },
        ]),
        sendMessage: vi.fn().mockResolvedValue({
          name: "Kleiton",
          headline: "Software Engineer",
          experiences: ["Resumo do perfil"],
        }),
      },
    });

    await expect(analyzeActiveProfile({ chromeApi })).rejects.toThrow(
      "A captura do perfil ficou incompleta nesta visualização do LinkedIn.",
    );
  });

  it("surfaces backend error messages from the API", async () => {
    const chromeApi = createChromeApi();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ message: "Payload inválido" }),
    });

    await expect(
      analyzeActiveProfile({ chromeApi, fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow("Payload inválido");
  });

  it("falls back to the HTTP status when the backend error payload is invalid", async () => {
    const chromeApi = createChromeApi();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockRejectedValue(new Error("invalid json")),
    });

    await expect(
      analyzeActiveProfile({ chromeApi, fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow("Backend returned 503");
  });
});

describe("reportClientError", () => {
  it("sends sanitized extension error context to the backend", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });

    await reportClientError(
      {
        context: "analyze-profile",
        message: "Falha no popup",
        expected: false,
        stack: "Error: boom",
      },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        apiBaseUrl: "https://api.example.com",
      },
    );

    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.com/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.stringContaining('"message":"Falha no popup"'),
    });
  });

  it("does not throw when client error reporting fails", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      reportClientError(
        {
          context: "analyze-profile",
          message: "Falha no popup",
          expected: true,
        },
        {
          fetchImpl: fetchImpl as unknown as typeof fetch,
          apiBaseUrl: "https://api.example.com",
        },
      ),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      "[LinkedIn Analyzer] Failed to report client error",
      expect.any(Error),
    );

    warnSpy.mockRestore();
  });
});

describe("exportAnalysisPdf", () => {
  it("serializes a local PDF and triggers a browser download", async () => {
    class FakeBlob {
      readonly type: string;

      private readonly value: string;

      constructor(parts: unknown[], options?: { type?: string }) {
        this.type = options?.type || "";
        this.value = parts.join("");
      }

      async text() {
        return this.value;
      }
    }

    const createObjectURL = vi.fn().mockReturnValue("blob:analysis-pdf");
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const appendChild = vi.spyOn(document.body, "appendChild");

    vi.stubGlobal("Blob", FakeBlob);
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });

    expect(
      exportAnalysisPdf(
        {
          ...createAnalysis(),
          resumo: "Percepção clara com ação concreta.",
          pontosFortes: ["Entrega com consistência"],
          pontosFracos: ["Precisa explicitar impacto"],
          problemas: ["Resumo sem números"],
          sugestoes: ["Adicionar métricas por projeto"],
        },
        {
          name: "Kleiton Não",
          headline: "Backend com integração",
          experiences: ["Atuação com APIs críticas"],
        },
      ),
    ).toBe(true);

    expect(createObjectURL).toHaveBeenCalledTimes(1);

    const pdfBlob = createObjectURL.mock.calls[0][0] as InstanceType<typeof FakeBlob>;
    const content = await pdfBlob.text();
    const link = appendChild.mock.calls[0][0] as HTMLAnchorElement;

    expect(pdfBlob.type).toBe("application/pdf");
    expect(content).toContain("%PDF-1.4");
    expect(content).toContain("/Type /Catalog");
    expect(content).toContain("/Count 1");
    expect(content).toContain("/Encoding /WinAnsiEncoding");
    expect(content).toContain("4B6C6569746F6E204EE36F");
    expect(link.download).toBe("kleiton-n-o-analysis.pdf");
    expect(link.href).toBe("blob:analysis-pdf");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:analysis-pdf");

    click.mockRestore();
    appendChild.mockRestore();
    vi.unstubAllGlobals();
  });

  it("covers text splitting, pagination and missing browser APIs in the local PDF writer", async () => {
    class FakeBlob {
      readonly type: string;

      private readonly value: string;

      constructor(parts: unknown[], options?: { type?: string }) {
        this.type = options?.type || "";
        this.value = parts.join("");
      }

      async text() {
        return this.value;
      }
    }

    const createObjectURL = vi.fn().mockReturnValue("blob:multi-page-pdf");
    const revokeObjectURL = vi.fn();

    vi.stubGlobal("Blob", FakeBlob);
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });

    const pdfDocument = new BrowserPdfDocument();

    expect(pdfDocument.internal.pageSize.getWidth()).toBeGreaterThan(500);
    expect(pdfDocument.splitTextToSize("   ", 120)).toEqual([""]);
    expect(pdfDocument.splitTextToSize("um teste simples", 24).length).toBeGreaterThan(1);
    expect(pdfDocument.splitTextToSize("supercalifragilisticoespialidoso", 24)[0]).toContain(" ");

    const lines = pdfDocument.splitTextToSize("PalavraMuitoLongaSemEspacos".repeat(24), 60);

    lines.forEach((line, index) => {
      pdfDocument.text(line, 40, 60 + (index * 14));
    });

    pdfDocument.addPage();
    pdfDocument.setFontSize(14);
    pdfDocument.text("Página 2 €漢", 40, 60);
    pdfDocument.save("multi-page.pdf");

    const pdfBlob = createObjectURL.mock.calls[0][0] as InstanceType<typeof FakeBlob>;
    const content = await pdfBlob.text();

    expect(content).toContain("/Count 2");
    expect(content).toContain("/Encoding /WinAnsiEncoding");
    expect(content).toContain("50E167696E61203220803F");

    vi.unstubAllGlobals();

    const unavailableApiDocument = new BrowserPdfDocument();

    vi.stubGlobal("Blob", undefined);
    vi.stubGlobal("URL", undefined);

    expect(() => unavailableApiDocument.save("noop.pdf")).not.toThrow();

    vi.unstubAllGlobals();
  });

  it("returns false when there is no analysis to export", () => {
    expect(exportAnalysisPdf(null, null)).toBe(false);
  });

  it("renders and saves the PDF with the normalized profile name", () => {
    const addPage = vi.fn();
    const save = vi.fn();

    class FakePdf {
      internal = {
        pageSize: {
          getHeight: () => 180,
        },
      };

      setFontSize = vi.fn();
      splitTextToSize = vi.fn((text: string) => [text]);
      text = vi.fn();
      addPage = addPage;
      save = save;
    }

    const analysis = {
      ...createAnalysis(),
      pontosFortes: ["Forte 1", "Forte 2"],
      pontosFracos: ["Fraco 1", "Fraco 2"],
      problemas: ["Problema 1", "Problema 2"],
      sugestoes: ["Sugestao 1", "Sugestao 2", "Sugestao 3"],
    };

    expect(
      exportAnalysisPdf(analysis, { name: "Kleiton Albuquerque", headline: "Backend Engineer" }, FakePdf),
    ).toBe(true);
    expect(addPage).toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith("kleiton-albuquerque-analysis.pdf");
  });

  it("includes captured experiences in the PDF when available", () => {
    const text = vi.fn();

    class FakePdf {
      internal = {
        pageSize: {
          getHeight: () => 600,
        },
      };

      setFontSize = vi.fn();
      splitTextToSize = vi.fn((value: string) => [value]);
      text = text;
      addPage = vi.fn();
      save = vi.fn();
    }

    exportAnalysisPdf(
      createAnalysis(),
      {
        name: "Kleiton Albuquerque",
        headline: "Backend Engineer",
        experiences: ["Liderou APIs e integracoes para 120 clientes."],
      },
      FakePdf,
    );

    expect(text).toHaveBeenCalledWith(
      ["Fonte da análise: Análise local"],
      40,
      expect.any(Number),
    );
    expect(text).toHaveBeenCalledWith("Experiências analisadas", 40, expect.any(Number));
    expect(text).toHaveBeenCalledWith(
      ["1. Liderou APIs e integracoes para 120 clientes."],
      40,
      expect.any(Number),
    );
  });

  it("renders all captured experiences instead of limiting the PDF to four entries", () => {
    const text = vi.fn();

    class FakePdf {
      internal = {
        pageSize: {
          getHeight: () => 900,
        },
      };

      setFontSize = vi.fn();
      splitTextToSize = vi.fn((value: string) => [value]);
      text = text;
      addPage = vi.fn();
      save = vi.fn();
    }

    exportAnalysisPdf(
      createAnalysis(),
      {
        name: "Kleiton Albuquerque",
        headline: "Backend Engineer",
        experiences: [
          "Experiencia 1",
          "Experiencia 2",
          "Experiencia 3",
          "Experiencia 4",
          "Experiencia 5",
        ],
      },
      FakePdf,
    );

    expect(text).toHaveBeenCalledWith(["5. Experiencia 5"], 40, expect.any(Number));
  });

  it("normalizes decomposed unicode before writing PDF text", () => {
    const text = vi.fn();

    class FakePdf {
      internal = {
        pageSize: {
          getHeight: () => 600,
        },
      };

      setFontSize = vi.fn();
      splitTextToSize = vi.fn((value: string) => [value]);
      text = text;
      addPage = vi.fn();
      save = vi.fn();
    }

    exportAnalysisPdf(
      {
        ...createAnalysis(),
        resumo: "Percepça\u0303o clara com aça\u0303o concreta.",
      },
      {
        name: "Kleiton Na\u0303o",
        headline: "Backend com integraça\u0303o",
        experiences: [],
      },
      FakePdf,
    );

    expect(text).toHaveBeenCalledWith(["Perfil: Kleiton Não"], 40, expect.any(Number));
    expect(text).toHaveBeenCalledWith(["Headline: Backend com integração"], 40, expect.any(Number));
    expect(text).toHaveBeenCalledWith(["Resumo: Percepção clara com ação concreta."], 40, expect.any(Number));
  });

  it("strips invisible unicode control characters before writing PDF text", () => {
    const text = vi.fn();

    class FakePdf {
      internal = {
        pageSize: {
          getHeight: () => 600,
        },
      };

      setFontSize = vi.fn();
      splitTextToSize = vi.fn((value: string) => [value]);
      text = text;
      addPage = vi.fn();
      save = vi.fn();
    }

    exportAnalysisPdf(
      {
        ...createAnalysis(),
        resumo: "Percep\u202Ação clara com ação concreta.",
      },
      {
        name: "Kleiton\u200B Albuquerque",
        headline: "Sou\u200B desenvolvedor com integra\u202Ação\u202C e ação prática.",
        experiences: [],
      },
      FakePdf,
    );

    expect(text).toHaveBeenCalledWith(["Perfil: Kleiton Albuquerque"], 40, expect.any(Number));
    expect(text).toHaveBeenCalledWith(
      ["Headline: Sou desenvolvedor com integração e ação prática."],
      40,
      expect.any(Number),
    );
    expect(text).toHaveBeenCalledWith(["Resumo: Percepção clara com ação concreta."], 40, expect.any(Number));
  });

  it("does not truncate long headline content too aggressively in the PDF", () => {
    const text = vi.fn();
    const splitTextToSize = vi.fn((value: string) => [value]);
    const longHeadline = "Sou desenvolvedor de software com foco em front-end com React e Next.js, além de atuação em back-end com Node.js e Java, participando da construção de aplicações escaláveis e resilientes para diferentes produtos digitais.";

    class FakePdf {
      internal = {
        pageSize: {
          getHeight: () => 600,
        },
      };

      setFontSize = vi.fn();
      splitTextToSize = splitTextToSize;
      text = text;
      addPage = vi.fn();
      save = vi.fn();
    }

    exportAnalysisPdf(
      createAnalysis(),
      {
        name: "Kleiton Albuquerque",
        headline: longHeadline,
        experiences: [],
      },
      FakePdf,
    );

    expect(splitTextToSize).toHaveBeenCalledWith(`Headline: ${longHeadline}`, 515);
  });

  it("truncates oversized PDF list entries to keep the layout stable", () => {
    const text = vi.fn();

    class FakePdf {
      internal = {
        pageSize: {
          getHeight: () => 600,
        },
      };

      setFontSize = vi.fn();
      splitTextToSize = vi.fn((value: string) => [value]);
      text = text;
      addPage = vi.fn();
      save = vi.fn();
    }

    exportAnalysisPdf(
      createAnalysis(),
      {
        name: "Kleiton Albuquerque",
        headline: "Backend Engineer",
        experiences: ["Experiencia muito longa ".repeat(90)],
      },
      FakePdf,
    );

    expect(text).toHaveBeenCalledWith(
      [expect.stringMatching(/^1\. .*\.\.\.$/)],
      40,
      expect.any(Number),
    );
  });

  it("skips empty PDF sections without breaking the document", () => {
    const text = vi.fn();

    class FakePdf {
      internal = {
        pageSize: {
          getHeight: () => 600,
        },
      };

      setFontSize = vi.fn();
      splitTextToSize = vi.fn((value: string) => [value]);
      text = text;
      addPage = vi.fn();
      save = vi.fn();
    }

    exportAnalysisPdf(
      {
        ...createAnalysis(),
        pontosFortes: [],
        pontosFracos: [],
        problemas: [],
        sugestoes: [],
      },
      {
        name: "Kleiton Albuquerque",
        headline: "Backend Engineer",
        experiences: [],
      },
      FakePdf,
    );

    expect(text).not.toHaveBeenCalledWith("Experiências analisadas", 40, expect.any(Number));
    expect(text).not.toHaveBeenCalledWith("Pontos fortes", 40, expect.any(Number));
  });
});
