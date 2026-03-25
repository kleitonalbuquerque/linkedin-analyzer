import { describe, expect, it, vi } from "vitest";

import {
  analyzeActiveProfile,
  buildPdfFileName,
  exportAnalysisPdf,
  getProfileFromActiveTab,
  hasProfileData,
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
});