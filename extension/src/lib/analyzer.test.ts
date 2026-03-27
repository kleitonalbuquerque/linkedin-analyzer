import { describe, expect, it, vi } from "vitest";

import {
  analyzeActiveProfile,
  buildPdfFileName,
  exportAnalysisPdf,
  formatAnalysisProvider,
  getProfileCaptureError,
  getProfileFromActiveTab,
  hasProfileData,
  isLikelyExternalHeadline,
  isSuspiciousProfileHeadline,
  isLinkedInProfileUrl,
  type AnalysisResult,
  type ChromeApi,
} from "./analyzer";

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
    scripting: {
      executeScript: vi.fn().mockResolvedValue(undefined),
      ...overrides.scripting,
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
    expect(isSuspiciousProfileHeadline("SRE Pleno (SP16101308)")).toBe(true);
    expect(isSuspiciousProfileHeadline("1 comentário")).toBe(true);
    expect(isSuspiciousProfileHeadline("A sociedade do desempenho, o ego e os adultos infantilizados no poder - Migalhas")).toBe(true);
    expect(isSuspiciousProfileHeadline('Por Que "Soft Skills" Não Significa Nada E O Que Usar no Lugar')).toBe(true);
    expect(isSuspiciousProfileHeadline("Backend Engineer")).toBe(false);
    expect(isLikelyExternalHeadline("SRE Pleno (SP16101308)")).toBe(true);
    expect(isLikelyExternalHeadline("A sociedade do desempenho, o ego e os adultos infantilizados no poder - Migalhas")).toBe(true);
    expect(isLikelyExternalHeadline('Por Que "Soft Skills" Não Significa Nada E O Que Usar no Lugar')).toBe(true);
    expect(isLikelyExternalHeadline("Como escalar plataformas: lições práticas para engenharia moderna")).toBe(true);
    expect(isLikelyExternalHeadline("How to scale Node.js APIs in production as a Backend Engineer")).toBe(false);
    expect(formatAnalysisProvider("local-fallback")).toBe("Analise local");
    expect(formatAnalysisProvider("groq:openai/gpt-oss-120b")).toContain("IA (Groq");
    expect(formatAnalysisProvider()).toBe("Nao informado");
    expect(formatAnalysisProvider("custom-provider")).toBe("custom-provider");
    expect(
      getProfileCaptureError(
        { name: "Kleiton", headline: "1 comentário", experiences: ["Projeto"] },
        "https://www.linkedin.com/in/teste/details/featured/",
      ),
    ).toContain("capturado metadados da pagina ou um titulo externo");
    expect(
      getProfileCaptureError(
        { name: "Kleiton", headline: "Software Engineer", experiences: ["Projeto 1", "Projeto 2"] },
        "https://www.linkedin.com/in/teste/",
      ),
    ).toBeNull();
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
    expect(chromeApi.scripting.executeScript).not.toHaveBeenCalled();
  });

  it("injects the content script and retries when the first message fails", async () => {
    const chromeApi = createChromeApi({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 10, url: "https://www.linkedin.com/in/teste" }]),
        sendMessage: vi
          .fn()
          .mockRejectedValueOnce(new Error("not ready"))
          .mockResolvedValueOnce({ headline: "Backend Engineer", experiences: [] }),
      },
    });

    await expect(getProfileFromActiveTab(10, chromeApi)).resolves.toEqual({
      headline: "Backend Engineer",
      experiences: [],
    });

    expect(chromeApi.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 10 },
      files: ["content/script.js"],
    });
    expect(chromeApi.tabs.sendMessage).toHaveBeenCalledTimes(2);
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

    await expect(analyzeActiveProfile({ chromeApi })).rejects.toThrow("Nao foi possivel capturar os dados do perfil exibido.");
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
      "O LinkedIn parece ter capturado metadados da pagina ou um titulo externo em vez da headline do perfil.",
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
      "O LinkedIn parece ter capturado metadados da pagina ou um titulo externo em vez da headline do perfil.",
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
      "O LinkedIn parece ter capturado metadados da pagina ou um titulo externo em vez da headline do perfil.",
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
      "O LinkedIn parece ter capturado metadados da pagina ou um titulo externo em vez da headline do perfil.",
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
      "O LinkedIn parece ter capturado metadados da pagina ou um titulo externo em vez da headline do perfil.",
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
      "A captura do perfil ficou incompleta nesta visualizacao do LinkedIn.",
    );
  });

  it("surfaces backend error messages from the API", async () => {
    const chromeApi = createChromeApi();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ message: "Payload invalido" }),
    });

    await expect(
      analyzeActiveProfile({ chromeApi, fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow("Payload invalido");
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

describe("exportAnalysisPdf", () => {
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
      ["Fonte da analise: Analise local"],
      40,
      expect.any(Number),
    );
    expect(text).toHaveBeenCalledWith("Experiencias analisadas", 40, expect.any(Number));
    expect(text).toHaveBeenCalledWith(
      ["1. Liderou APIs e integracoes para 120 clientes."],
      40,
      expect.any(Number),
    );
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
        experiences: ["Experiencia muito longa ".repeat(30)],
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

    expect(text).not.toHaveBeenCalledWith("Experiencias analisadas", 40, expect.any(Number));
    expect(text).not.toHaveBeenCalledWith("Pontos fortes", 40, expect.any(Number));
  });
});