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
  hasMoreExperienceDetails?: boolean;
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
};

type FetchImpl = typeof fetch;

export type ClientErrorReport = {
  message: string;
  context: string;
  expected: boolean;
  stack?: string;
};

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

type PdfConstructor = new (options?: { unit: string; format: string }) => PdfDocument;

type PdfTextOperation = {
  text: string[];
  x: number;
  y: number;
  fontSize: number;
};

const PDF_MAX_SECTION_ITEMS = 4;
const PDF_MAX_TEXT_LENGTH = 260;
const PDF_MAX_HEADLINE_LENGTH = 1600;
const PDF_MAX_SUMMARY_LENGTH = 600;
const PDF_MAX_EXPERIENCE_TEXT_LENGTH = 1400;
const PDF_A4_WIDTH = 595.28;
const PDF_A4_HEIGHT = 841.89;
const PDF_TEXT_WIDTH_FACTOR = 0.52;
const PDF_LINE_HEIGHT_OFFSET = 2;
const INVISIBLE_FORMAT_CHARACTER_PATTERN = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const PDF_WIN_ANSI_SPECIAL_CHARS = new Map<number, number>([
  [8364, 128],
  [8218, 130],
  [402, 131],
  [8222, 132],
  [8230, 133],
  [8224, 134],
  [8225, 135],
  [710, 136],
  [8240, 137],
  [352, 138],
  [8249, 139],
  [338, 140],
  [381, 142],
  [8216, 145],
  [8217, 146],
  [8220, 147],
  [8221, 148],
  [8226, 149],
  [8211, 150],
  [8212, 151],
  [732, 152],
  [8482, 153],
  [353, 154],
  [8250, 155],
  [339, 156],
  [382, 158],
  [376, 159],
]);
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
const SOCIAL_PROOF_HEADLINE_PATTERN = /(?:^|\s)(?:me ajudou a conseguir (?:este|esse) emprego|helped me get this job)(?:$|\s)/i;
const SOCIAL_CONTEXT_HEADLINE_PATTERN =
  /(?:\be mais (?:\d{1,3}(?:[.,]\d{3})+|\d+) pessoas?\b|\band (?:\d{1,3}(?:[.,]\d{3})+|\d+) other people\b|\bmutual connections?\b|\bconex(?:ao|ões|oes) em comum\b|\bfollows? you\b|\bsegue voce\b)/i;

export class BrowserPdfDocument implements PdfDocument {
  internal = {
    pageSize: {
      getWidth: () => PDF_A4_WIDTH,
      getHeight: () => PDF_A4_HEIGHT,
    },
  };

  private fontSize = 12;

  private readonly pages: PdfTextOperation[][] = [[]];

  setFontSize(size: number) {
    this.fontSize = size;
  }

  splitTextToSize(text: string, maxWidth: number) {
    const normalized = normalizeUnicodeText(text);

    if (!normalized) {
      return [""];
    }

    const words = normalized.split(/\s+/).filter(Boolean);

    /* v8 ignore next -- a non-empty normalized string always yields at least one word */
    if (!words.length) {
      return [normalized];
    }

    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;

      if (this.estimateTextWidth(nextLine) <= maxWidth) {
        currentLine = nextLine;
        continue;
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      currentLine = this.breakLongWord(word, maxWidth);
    }

    /* v8 ignore next -- after iterating at least one word, currentLine is always populated */
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length ? lines : [normalized];
  }

  text(text: string | string[], x: number, y: number) {
    const currentPage = this.pages.at(-1);

    /* v8 ignore next -- the document always starts with one page and pages are never removed */
    if (!currentPage) {
      return;
    }

    currentPage.push({
      text: Array.isArray(text) ? text : [text],
      x,
      y,
      fontSize: this.fontSize,
    });
  }

  addPage() {
    this.pages.push([]);
  }

  save(fileName: string) {
    if (typeof Blob === "undefined" || typeof document === "undefined" || typeof URL === "undefined") {
      return;
    }

    const pdfContent = this.buildPdfContent();
    const blob = new Blob([pdfContent], { type: "application/pdf" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  }

  private estimateTextWidth(text: string) {
    return text.length * this.fontSize * PDF_TEXT_WIDTH_FACTOR;
  }

  private breakLongWord(word: string, maxWidth: number) {
    if (this.estimateTextWidth(word) <= maxWidth) {
      return word;
    }

    const approximateChars = Math.max(1, Math.floor(maxWidth / (this.fontSize * PDF_TEXT_WIDTH_FACTOR)));
    const segments: string[] = [];

    for (let index = 0; index < word.length; index += approximateChars) {
      segments.push(word.slice(index, index + approximateChars));
    }

    return segments.join(" ");
  }

  private buildPdfContent() {
    const objects: string[] = [];
    const pageObjectNumbers: number[] = [];
    const fontObjectNumber = 3;

    objects[0] = "";
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = "";
    objects[fontObjectNumber] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";

    let nextObjectNumber = fontObjectNumber + 1;

    for (const pageOperations of this.pages) {
      const contentStream = this.buildPageStream(pageOperations);
      const contentObjectNumber = nextObjectNumber++;
      const pageObjectNumber = nextObjectNumber++;

      pageObjectNumbers.push(pageObjectNumber);
      objects[contentObjectNumber] = `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`;
      objects[pageObjectNumber] = [
        "<< /Type /Page",
        "/Parent 2 0 R",
        `/MediaBox [0 0 ${PDF_A4_WIDTH} ${PDF_A4_HEIGHT}]`,
        `/Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >>`,
        `/Contents ${contentObjectNumber} 0 R`,
        ">>",
      ].join("\n");
    }

    const pageKids = pageObjectNumbers.map((objectNumber) => `${objectNumber} 0 R`).join(" ");

    objects[2] = [
      `<< /Type /Pages /Count ${pageObjectNumbers.length}`,
      `/Kids [${pageKids}]`,
      ">>",
    ].join("\n");

    return this.serializePdf(objects);
  }

  private buildPageStream(pageOperations: PdfTextOperation[]) {
    return pageOperations
      .flatMap((operation) => operation.text.map((line, lineIndex) => this.buildTextCommand(
        line,
        operation.x,
        operation.y + (lineIndex * (operation.fontSize + PDF_LINE_HEIGHT_OFFSET)),
        operation.fontSize,
      )))
      .join("\n");
  }

  private buildTextCommand(text: string, x: number, y: number, fontSize: number) {
    const encodedText = this.encodePdfText(text);
    const pdfY = PDF_A4_HEIGHT - y;

    return `BT\n/F1 ${fontSize} Tf\n1 0 0 1 ${x.toFixed(2)} ${pdfY.toFixed(2)} Tm\n<${encodedText}> Tj\nET`;
  }

  private encodePdfText(text: string) {
    return Array.from(normalizeUnicodeText(text), (character) => this.encodePdfCharacter(character))
      .map((value) => value.toString(16).padStart(2, "0").toUpperCase())
      .join("");
  }

  private encodePdfCharacter(character: string) {
    const codePoint = character.codePointAt(0) || 63;

    if (codePoint >= 32 && codePoint <= 126) {
      return codePoint;
    }

    if ((codePoint >= 160 && codePoint <= 255) || codePoint === 10 || codePoint === 13) {
      return codePoint;
    }

    const decomposedAsciiFallback = character
      .normalize("NFKD")
      .replaceAll(/[\u0300-\u036f]/g, "")
      .charCodeAt(0);

    if (decomposedAsciiFallback >= 32 && decomposedAsciiFallback <= 126) {
      return decomposedAsciiFallback;
    }

    return PDF_WIN_ANSI_SPECIAL_CHARS.get(codePoint) || 63;
  }

  private serializePdf(objects: string[]) {
    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];

    for (let index = 1; index < objects.length; index += 1) {
      offsets[index] = pdf.length;
      pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
    }

    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length}\n`;
    pdf += "0000000000 65535 f \n";

    for (let index = 1; index < objects.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }

    pdf += [
      "trailer",
      `<< /Size ${objects.length} /Root 1 0 R >>`,
      "startxref",
      String(xrefStart),
      "%%EOF",
    ].join("\n");

    return pdf;
  }
}

function normalizeUnicodeText(value?: string) {
  return replaceControlCharacters(String(value || ""))
    .replaceAll(INVISIBLE_FORMAT_CHARACTER_PATTERN, "")
    .normalize("NFC")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function replaceControlCharacters(value: string) {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;

    if (
      codePoint <= 8
      || codePoint === 11
      || codePoint === 12
      || (codePoint >= 14 && codePoint <= 31)
      || (codePoint >= 127 && codePoint <= 159)
    ) {
      return " ";
    }

    return character;
  }).join("");
}

function sleep(delayMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function getExtensionVersion() {
  return globalThis.chrome?.runtime?.getManifest?.().version || "";
}

export async function reportClientError(
  report: ClientErrorReport,
  {
    fetchImpl = fetch,
    apiBaseUrl = API_BASE_URL,
  }: {
    fetchImpl?: FetchImpl;
    apiBaseUrl?: string;
  } = {},
) {
  try {
    await fetchImpl(`${apiBaseUrl}/client-errors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "extension-popup",
        context: report.context,
        message: report.message,
        expected: report.expected,
        stack: report.stack,
        extensionVersion: getExtensionVersion(),
        userAgent: globalThis.navigator?.userAgent || "",
      }),
    });
  } catch (error) {
    console.warn("[LinkedIn Analyzer] Failed to report client error", error);
  }
}

function normalizeProfile(profile: LinkedInProfile): LinkedInProfile {
  return {
    name: normalizeUnicodeText(profile.name),
    headline: normalizeUnicodeText(profile.headline),
    experiences: Array.isArray(profile.experiences)
      ? profile.experiences.map((experience) => normalizeUnicodeText(experience)).filter(Boolean)
      : [],
    ...(profile.hasMoreExperienceDetails ? { hasMoreExperienceDetails: true } : {}),
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

  if (SOCIAL_PROOF_HEADLINE_PATTERN.test(rawHeadline)) {
    return true;
  }

  if (SOCIAL_CONTEXT_HEADLINE_PATTERN.test(rawHeadline)) {
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
  const normalized = normalizeCaptureHeadline(headline);

  return INVALID_CAPTURE_HEADLINE_TERMS.has(normalized)
    || SOCIAL_PROOF_HEADLINE_PATTERN.test(normalized)
    || SOCIAL_CONTEXT_HEADLINE_PATTERN.test(normalizeUnicodeText(headline))
    || isLikelyExternalHeadline(headline);
}

export function getProfileCaptureError(profile: LinkedInProfile, tabUrl?: string) {
  if (isSuspiciousProfileHeadline(profile.headline)) {
    return "O LinkedIn parece ter capturado metadados da página ou um título externo em vez da headline do perfil. Feche modais e analise a página principal do perfil.";
  }

  const experiencesCount = profile.experiences?.length || 0;
  const isDetailsPage = typeof tabUrl === "string" && tabUrl.includes("/details/");
  const isExperienceDetailsPage = typeof tabUrl === "string" && tabUrl.includes("/details/experience");

  if (profile.hasMoreExperienceDetails && !isExperienceDetailsPage && experiencesCount <= 2) {
    return "Abra a seção Todas as experiências do LinkedIn e execute a análise nessa tela para capturar a lista completa.";
  }

  if (isDetailsPage && !isExperienceDetailsPage && experiencesCount < 2) {
    return "A captura do perfil ficou incompleta nesta visualização do LinkedIn. Volte para a página principal do perfil antes de analisar.";
  }

  return null;
}

export function formatAnalysisProvider(provider?: string) {
  if (!provider) {
    return "Não informado";
  }

  if (provider === "local-fallback") {
    return "Análise local";
  }

  if (provider.startsWith("groq:")) {
    return `IA (${provider.replace("groq:", "Groq ")})`;
  }

  return provider;
}

function isMissingReceiverError(error: unknown) {
  return error instanceof Error
    && /Could not establish connection|Receiving end does not exist|The message port closed/i.test(error.message);
}

export async function getProfileFromActiveTab(
  tabId: number,
  chromeApi: ChromeApi = chrome,
  {
    maxRetries = 3,
    retryDelayMs = 150,
    sleepImpl = sleep,
  }: {
    maxRetries?: number;
    retryDelayMs?: number;
    sleepImpl?: (delayMs: number) => Promise<unknown>;
  } = {},
): Promise<LinkedInProfile> {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await chromeApi.tabs.sendMessage(tabId, PROFILE_MESSAGE);
    } catch (error) {
      if (!isMissingReceiverError(error) || attempt === maxRetries) {
        throw new Error("Atualize a aba do LinkedIn aberta e tente novamente.");
      }

      await sleepImpl(retryDelayMs);
    }
  }

  throw new Error("Atualize a aba do LinkedIn aberta e tente novamente.");
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
    throw new Error("Não foi possível capturar os dados do perfil exibido.");
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
  PdfCtor: PdfConstructor = BrowserPdfDocument,
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

  const trimPdfText = (text: string, maxLength = PDF_MAX_TEXT_LENGTH) => {
    const normalizedText = normalizeUnicodeText(text);

    return normalizedText.length > maxLength
      ? `${normalizedText.slice(0, maxLength - 3).trim()}...`
      : normalizedText;
  };

  const writeBlock = (text: string, fontSize = 12, gapAfter = 16, maxLength = PDF_MAX_TEXT_LENGTH) => {
    document.setFontSize(fontSize);
    const lines = document.splitTextToSize(trimPdfText(text, maxLength), maxWidth);
    const lineHeight = fontSize + PDF_LINE_HEIGHT_OFFSET;
    const height = lines.length * lineHeight;
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

  const writeListSection = (
    title: string,
    items: string[],
    limit = PDF_MAX_SECTION_ITEMS,
    maxLength = PDF_MAX_TEXT_LENGTH,
  ) => {
    if (!items.length) {
      return;
    }

    writeSectionTitle(title);
    items.slice(0, limit).forEach((item, index) => {
      writeBlock(`${index + 1}. ${item}`, 12, 12, maxLength);
    });
  };

  document.setFontSize(20);
  document.text("LinkedIn Analyzer Report", left, cursorY);
  cursorY += 28;

  writeBlock(`Perfil: ${profile?.name || "Não informado"}`, 12, 16, 600);
  writeBlock(`Headline: ${profile?.headline || "Não informado"}`, 12, 16, PDF_MAX_HEADLINE_LENGTH);

  writeBlock(`Nível: ${analysis.nivel}`);
  writeBlock(`Score de mercado: ${analysis.score}/100`);
  writeBlock(`Foco principal: ${analysis.foco}`);
  writeBlock(`Fonte da análise: ${formatAnalysisProvider(analysis.provider)}`);
  writeBlock(`Benchmark: ${analysis.benchmark}`, 12, 16, PDF_MAX_SUMMARY_LENGTH);
  writeBlock(`Resumo: ${analysis.resumo}`, 12, 16, PDF_MAX_SUMMARY_LENGTH);

  writeListSection("Experiências analisadas", profile?.experiences || [], profile?.experiences?.length || 0, PDF_MAX_EXPERIENCE_TEXT_LENGTH);
  writeListSection("Pontos fortes", analysis.pontosFortes);
  writeListSection("Pontos fracos", analysis.pontosFracos);
  writeListSection("Problemas identificados", analysis.problemas);
  writeListSection("Sugestões prioritárias", analysis.sugestoes);

  document.save(`${buildPdfFileName(profile)}-analysis.pdf`);

  return true;
}
