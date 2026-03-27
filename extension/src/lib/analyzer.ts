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

const PDF_MAX_SECTION_ITEMS = 4;
const PDF_MAX_TEXT_LENGTH = 260;
const INVALID_CAPTURE_HEADLINE_TERMS = new Set([
  "live",
  "comentario",
  "comentarios",
  "comment",
  "comments",
  "compartilhamento",
  "compartilhamentos",
  "share",
  "shares",
  "curtida",
  "curtidas",
  "like",
  "likes",
]);
const PROFESSIONAL_HEADLINE_KEYWORDS = [
  "engineer",
  "engenheiro",
  "developer",
  "desenvolvedor",
  "software",
  "frontend",
  "front-end",
  "backend",
  "back-end",
  "full stack",
  "fullstack",
  "react",
  "next",
  "node",
  "java",
  "typescript",
  "analista",
  "analyst",
  "especialista",
  "specialist",
  "arquiteto",
  "architect",
  "ux",
  "ui",
  "product",
  "produto",
];
const EXTERNAL_HEADLINE_SOURCE_TERMS = [
  "migalhas",
  "medium",
  "substack",
  "youtube",
  "uol",
  "globo",
  "g1",
  "forbes",
  "exame",
  "cnn",
  "terra",
  "folha",
  "estadao",
  "estadão",
  "valor",
];
const EDITORIAL_HEADLINE_PREFIXES = ["a ", "o ", "as ", "os ", "como ", "por que ", "porque ", "why ", "how ", "the "];
const JOB_REFERENCE_PATTERN = /\(([a-z]{2,}[\d-]{3,}|[a-z]+\d{4,}|[a-z]{1,4}\d{5,})\)$/i;

function normalizeUnicodeText(value?: string) {
  return String(value || "")
    .normalize("NFC")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function normalizeProfile(profile: LinkedInProfile): LinkedInProfile {
  return {
    name: normalizeUnicodeText(profile.name),
    headline: normalizeUnicodeText(profile.headline),
    experiences: Array.isArray(profile.experiences)
      ? profile.experiences.map((experience) => normalizeUnicodeText(experience)).filter(Boolean)
      : [],
  };
}

function normalizeCaptureHeadline(value?: string) {
  return normalizeUnicodeText(value)
    .replaceAll(/^\d+[\d.,k]*\s+/gi, "")
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasProfessionalHeadlineSignal(value?: string) {
  const normalized = normalizeCaptureHeadline(value);

  return PROFESSIONAL_HEADLINE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function isLikelyExternalHeadline(headline?: string) {
  const rawHeadline = normalizeUnicodeText(headline);
  const normalized = normalizeCaptureHeadline(rawHeadline);

  if (!normalized) {
    return false;
  }

  if (JOB_REFERENCE_PATTERN.test(rawHeadline)) {
    return true;
  }

  if (EXTERNAL_HEADLINE_SOURCE_TERMS.some((term) => normalized.includes(term))) {
    return true;
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const startsLikeEditorialTitle = EDITORIAL_HEADLINE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  const hasEditorialShape = (rawHeadline.includes("?") || rawHeadline.includes(":")) && words.length >= 7;

  return words.length >= 8 && !hasProfessionalHeadlineSignal(rawHeadline) && (startsLikeEditorialTitle || hasEditorialShape);
}

export function isLinkedInProfileUrl(url?: string) {
  return typeof url === "string" && url.includes("linkedin.com/in/");
}

export function hasProfileData(profile: LinkedInProfile) {
  return Boolean(profile.headline) || Boolean(profile.experiences && profile.experiences.length > 0);
}

export function isSuspiciousProfileHeadline(headline?: string) {
  return INVALID_CAPTURE_HEADLINE_TERMS.has(normalizeCaptureHeadline(headline)) || isLikelyExternalHeadline(headline);
}

export function getProfileCaptureError(profile: LinkedInProfile, tabUrl?: string) {
  if (isSuspiciousProfileHeadline(profile.headline)) {
    return "O LinkedIn parece ter capturado metadados da pagina ou um titulo externo em vez da headline do perfil. Feche modais e analise a pagina principal do perfil.";
  }

  const experiencesCount = profile.experiences?.length || 0;
  const isDetailsPage = typeof tabUrl === "string" && tabUrl.includes("/details/");

  if (isDetailsPage && experiencesCount < 2) {
    return "A captura do perfil ficou incompleta nesta visualizacao do LinkedIn. Volte para a pagina principal do perfil antes de analisar.";
  }

  return null;
}

export function formatAnalysisProvider(provider?: string) {
  if (!provider) {
    return "Nao informado";
  }

  if (provider === "local-fallback") {
    return "Analise local";
  }

  if (provider.startsWith("groq:")) {
    return `IA (${provider.replace("groq:", "Groq ")})`;
  }

  return provider;
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
  return normalizeUnicodeText(profile?.name || "linkedin-profile")
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

  const rawProfile = await getProfileFromActiveTab(tab.id, chromeApi);
  const profile = normalizeProfile(rawProfile);

  if (!hasProfileData(profile)) {
    console.warn("[LinkedIn Analyzer] Profile data was empty", profile);
    throw new Error("Nao foi possivel capturar os dados do perfil exibido.");
  }

  const profileCaptureError = getProfileCaptureError(profile, tab.url);

  if (profileCaptureError) {
    console.warn("[LinkedIn Analyzer] Suspicious profile capture", { profile, tabUrl: tab.url });
    throw new Error(profileCaptureError);
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

  const trimPdfText = (text: string) => text.length > PDF_MAX_TEXT_LENGTH
    ? `${normalizeUnicodeText(text).slice(0, PDF_MAX_TEXT_LENGTH - 3).trim()}...`
    : normalizeUnicodeText(text);

  const writeBlock = (text: string, fontSize = 12, gapAfter = 16) => {
    document.setFontSize(fontSize);
    const lines = document.splitTextToSize(trimPdfText(text), maxWidth);
    const height = lines.length * (fontSize + 2);
    ensureSpace(height + gapAfter);
    document.text(lines, left, cursorY);
    cursorY += height + gapAfter;
  };

  const writeSectionTitle = (title: string) => {
    document.setFontSize(14);
    ensureSpace(24);
    document.text(title, left, cursorY);
    cursorY += 20;
  };

  const writeListSection = (title: string, items: string[]) => {
    if (!items.length) {
      return;
    }

    writeSectionTitle(title);
    items.slice(0, PDF_MAX_SECTION_ITEMS).forEach((item, index) => {
      writeBlock(`${index + 1}. ${item}`, 12, 12);
    });
  };

  document.setFontSize(20);
  document.text("LinkedIn Analyzer Report", left, cursorY);
  cursorY += 28;

  writeBlock(`Perfil: ${profile?.name || "Nao informado"}`);
  writeBlock(`Headline: ${profile?.headline || "Nao informado"}`);

  writeBlock(`Nivel: ${analysis.nivel}`);
  writeBlock(`Score de mercado: ${analysis.score}/100`);
  writeBlock(`Foco principal: ${analysis.foco}`);
  writeBlock(`Fonte da analise: ${formatAnalysisProvider(analysis.provider)}`);
  writeBlock(`Benchmark: ${analysis.benchmark}`);
  writeBlock(`Resumo: ${analysis.resumo}`);

  writeListSection("Experiencias analisadas", profile?.experiences || []);
  writeListSection("Pontos fortes", analysis.pontosFortes);
  writeListSection("Pontos fracos", analysis.pontosFracos);
  writeListSection("Problemas identificados", analysis.problemas);
  writeListSection("Sugestoes prioritarias", analysis.sugestoes);

  document.save(`${buildPdfFileName(profile)}-analysis.pdf`);

  return true;
}