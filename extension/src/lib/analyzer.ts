import { jsPDF } from "jspdf";

const DEFAULT_API_BASE_URL = "http://localhost:3000";
const PROFILE_MESSAGE = { type: "GET_PROFILE" } as const;

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

export type AnalysisResult = {
  nivel: string;
  score: number;
  foco: string;
  pontosFortes: string[];
  pontosFracos: string[];
  problemas: string[];
  benchmark: string;
  resumo: string;
  sugestoes: string[];
  provider: string;
};

export type LinkedInProfile = {
  name?: string;
  headline?: string;
  experiences?: string[];
};

type BrowserTab = {
  id?: number;
  url?: string;
};

export type ChromeApi = {
  tabs: {
    query(queryInfo: chrome.tabs.QueryInfo): Promise<BrowserTab[]>;
    sendMessage(tabId: number, message: typeof PROFILE_MESSAGE): Promise<LinkedInProfile>;
  };
  scripting: {
    executeScript(injection: {
      target: { tabId: number };
      files: string[];
    }): Promise<unknown>;
  };
};

type FetchImpl = typeof fetch;

type PdfDocument = {
  internal: {
    pageSize: {
      getHeight(): number;
    };
  };
  setFontSize(size: number): void;
  splitTextToSize(text: string, maxWidth: number): string[];
  text(text: string | string[], x: number, y: number): void;
  addPage(): void;
  save(fileName: string): void;
};

type PdfConstructor = new (options: { unit: string; format: string }) => PdfDocument;

export function isLinkedInProfileUrl(url?: string) {
  return typeof url === "string" && url.includes("linkedin.com/in/");
}

export function hasProfileData(profile: LinkedInProfile) {
  return Boolean(profile.headline) || Boolean(profile.experiences && profile.experiences.length > 0);
}

export async function getProfileFromActiveTab(tabId: number, chromeApi: ChromeApi = chrome) {
  try {
    return await chromeApi.tabs.sendMessage(tabId, PROFILE_MESSAGE);
  } catch (error) {
    console.warn("[LinkedIn Analyzer] Content script not ready, injecting it", error);

    await chromeApi.scripting.executeScript({
      target: { tabId },
      files: ["content/script.js"],
    });

    return chromeApi.tabs.sendMessage(tabId, PROFILE_MESSAGE);
  }
}

export function buildPdfFileName(profile: LinkedInProfile | null) {
  return (profile?.name || "linkedin-profile")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "") || "linkedin-profile";
}

export async function analyzeActiveProfile({
  chromeApi = chrome,
  fetchImpl = fetch,
  apiBaseUrl = API_BASE_URL,
}: {
  chromeApi?: ChromeApi;
  fetchImpl?: FetchImpl;
  apiBaseUrl?: string;
} = {}) {
  console.info("[LinkedIn Analyzer] Starting profile analysis");

  const [tab] = await chromeApi.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab?.id) {
    console.warn("[LinkedIn Analyzer] No active tab found");
    throw new Error("Nenhuma aba ativa encontrada.");
  }

  if (!isLinkedInProfileUrl(tab.url)) {
    console.warn("[LinkedIn Analyzer] Active tab is not a LinkedIn profile", tab.url);
    throw new Error("Abra um perfil do LinkedIn antes de analisar.");
  }

  const profile = await getProfileFromActiveTab(tab.id, chromeApi);

  if (!hasProfileData(profile)) {
    console.warn("[LinkedIn Analyzer] Profile data was empty", profile);
    throw new Error("Nao foi possivel capturar os dados do perfil exibido.");
  }

  console.info("[LinkedIn Analyzer] Profile captured", profile);

  const response = await fetchImpl(`${apiBaseUrl}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    const message = typeof errorPayload?.message === "string"
      ? errorPayload.message
      : `Backend returned ${response.status}`;

    throw new Error(message);
  }

  const analysis = (await response.json()) as AnalysisResult;
  console.info("[LinkedIn Analyzer] Analysis finished", analysis);

  return { profile, analysis };
}

export function exportAnalysisPdf(
  analysis: AnalysisResult | null,
  profile: LinkedInProfile | null,
  PdfCtor: PdfConstructor = jsPDF as unknown as PdfConstructor,
) {
  if (!analysis) {
    return false;
  }

  const document = new PdfCtor({ unit: "pt", format: "a4" });
  const pageHeight = document.internal.pageSize.getHeight();
  const left = 40;
  const maxWidth = 515;
  let cursorY = 52;

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY + requiredHeight > pageHeight - 40) {
      document.addPage();
      cursorY = 52;
    }
  };

  const writeBlock = (text: string, fontSize = 12, gapAfter = 16) => {
    document.setFontSize(fontSize);
    const lines = document.splitTextToSize(text, maxWidth);
    const height = lines.length * (fontSize + 2);
    ensureSpace(height + gapAfter);
    document.text(lines, left, cursorY);
    cursorY += height + gapAfter;
  };

  document.setFontSize(20);
  document.text("LinkedIn Analyzer Report", left, cursorY);
  cursorY += 28;

  writeBlock(`Perfil: ${profile?.name || "Nao informado"}`);
  writeBlock(`Headline: ${profile?.headline || "Nao informado"}`);
  writeBlock(`Nivel: ${analysis.nivel}`);
  writeBlock(`Score de mercado: ${analysis.score}/100`);
  writeBlock(`Foco principal: ${analysis.foco}`);
  writeBlock(`Benchmark: ${analysis.benchmark}`);
  writeBlock(`Resumo: ${analysis.resumo}`);

  document.setFontSize(14);
  ensureSpace(24);
  document.text("Pontos fortes", left, cursorY);
  cursorY += 20;

  analysis.pontosFortes.forEach((item, index) => {
    writeBlock(`${index + 1}. ${item}`, 12, 12);
  });

  document.setFontSize(14);
  ensureSpace(24);
  document.text("Pontos fracos", left, cursorY);
  cursorY += 20;

  analysis.pontosFracos.forEach((item, index) => {
    writeBlock(`${index + 1}. ${item}`, 12, 12);
  });

  document.setFontSize(14);
  ensureSpace(24);
  document.text("Problemas identificados", left, cursorY);
  cursorY += 20;

  analysis.problemas.forEach((item, index) => {
    writeBlock(`${index + 1}. ${item}`, 12, 12);
  });

  document.setFontSize(14);
  ensureSpace(24);
  document.text("Sugestoes prioritarias", left, cursorY);
  cursorY += 20;

  analysis.sugestoes.forEach((suggestion, index) => {
    writeBlock(`${index + 1}. ${suggestion}`, 12, 12);
  });

  document.save(`${buildPdfFileName(profile)}-analysis.pdf`);

  return true;
}