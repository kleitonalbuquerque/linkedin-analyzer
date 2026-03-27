export type ExtractedLinkedInProfile = {
  name?: string;
  headline?: string;
  experiences?: string[];
};

const MAX_EXPERIENCE_LENGTH = 280;
const HEADLINE_METADATA_TERMS = new Set([
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
  "seguidor",
  "seguidores",
  "follower",
  "followers",
  "conexao",
  "conexoes",
  "connection",
  "connections",
]);
const SECONDARY_HEADLINE_METADATA_PATTERN = /seguidores|followers|conexoes|connections|contact info/i;
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
  "tech lead",
  "lead",
  "analista",
  "analyst",
  "especialista",
  "specialist",
  "arquiteto",
  "architect",
  "ux",
  "ui",
  "produto",
  "product",
  "designer",
  "consultant",
  "consultor",
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
const EDITORIAL_HEADLINE_PREFIXES = ["a ", "o ", "as ", "os ", "como ", "why ", "how ", "the "];

function stripCountPrefix(value: string) {
  return value.replaceAll(/^\d+[\d.,k]*\s+/gi, "");
}

function normalizeText(value?: string | null) {
  return String(value || "").replaceAll(/\s+/g, " ").trim();
}

function normalizeMetadataToken(value: string) {
  return stripCountPrefix(normalizeText(value))
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasProfessionalHeadlineSignal(value: string) {
  const normalized = normalizeMetadataToken(value);

  return PROFESSIONAL_HEADLINE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function isLikelyExternalHeadline(value: string) {
  const normalized = normalizeMetadataToken(value);

  if (!normalized || !hasMeaningfulLetters(value)) {
    return false;
  }

  if (EXTERNAL_HEADLINE_SOURCE_TERMS.some((term) => normalized.includes(term))) {
    return true;
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const startsLikeEditorialTitle = EDITORIAL_HEADLINE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  const hasEditorialShape = (value.includes("?") || value.includes(":")) && words.length >= 7;

  return words.length >= 8 && !hasProfessionalHeadlineSignal(value) && (startsLikeEditorialTitle || hasEditorialShape);
}

function uniqueTexts(values: string[]) {
  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))];
}

function hasMeaningfulLetters(value: string) {
  return /[A-Za-zÀ-ÿ]/.test(value);
}

export function isMetadataHeadline(value: string) {
  return HEADLINE_METADATA_TERMS.has(normalizeMetadataToken(value));
}

function getFirstText(root: ParentNode, selectors: string[]) {
  for (const selector of selectors) {
    const text = normalizeText(root.querySelector(selector)?.textContent);

    if (text) {
      return text;
    }
  }

  return "";
}

function getTopCard(root: Document) {
  const nameElement = root.querySelector("main h1, h1");

  if (nameElement) {
    return nameElement.closest("section, div") || nameElement.parentElement || root.querySelector("main") || root.body;
  }

  return root.querySelector("main") || root.body;
}

function cleanHeadline(value: string, name: string) {
  if (!value) {
    return "";
  }

  return value
    .split(/[\n\u00b7]/)
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .find(
      (part) =>
        part !== name &&
        hasMeaningfulLetters(part) &&
        !isMetadataHeadline(part) &&
        !isLikelyExternalHeadline(part) &&
        !SECONDARY_HEADLINE_METADATA_PATTERN.test(part),
    ) || "";
}

function extractNameFromTitle(root: Document) {
  const normalizedTitle = normalizeText(root.title);

  if (!normalizedTitle) {
    return "";
  }

  const [firstSegment] = normalizedTitle.split(/\s+-\s+|\|/).map((segment) => normalizeText(segment));
  return firstSegment && hasMeaningfulLetters(firstSegment) ? firstSegment : "";
}

function extractHeadlineFromTitle(root: Document, name: string) {
  const normalizedTitle = normalizeText(root.title);

  if (!normalizedTitle || !/linkedin/i.test(normalizedTitle)) {
    return "";
  }

  const segments = normalizedTitle
    .split(/\|/)
    .map((segment) => normalizeText(segment))
    .filter(Boolean);

  const firstRelevantSegment = segments.find(
    (segment) => segment !== name && !/linkedin/i.test(segment),
  );

  const roleSegment = firstRelevantSegment?.includes(" - ")
    ? normalizeText(firstRelevantSegment.split(" - ").slice(1).join(" - "))
    : firstRelevantSegment;

  return roleSegment && hasMeaningfulLetters(roleSegment) && !isLikelyExternalHeadline(roleSegment)
    ? roleSegment
    : "";
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trim()}...`;
}

function findSectionByHeading(root: Document, pattern: RegExp) {
  const sections = Array.from(root.querySelectorAll("main section, section"));

  return sections.find((section) => {
    const heading = getFirstText(section, ["h1", "h2", "h3"]);
    return pattern.test(heading);
  }) || null;
}

function findSection(root: Document, idFragment: string, headingPattern: RegExp) {
  const byId = root.querySelector(`section[id*="${idFragment}"], div[id*="${idFragment}"]`)?.closest("section");

  if (byId) {
    return byId;
  }

  return findSectionByHeading(root, headingPattern);
}

function extractAboutText(section: Element | null) {
  if (!section) {
    return "";
  }

  const candidates = uniqueTexts(
    Array.from(section.querySelectorAll("span[aria-hidden='true'], p, .inline-show-more-text"))
      .map((element) => normalizeText(element.textContent)),
  );

  return candidates.find(
    (text) => text.length >= 40 && !/^(sobre|about)$/i.test(text),
  ) || "";
}

function extractExperienceTexts(section: Element | null) {
  if (!section) {
    return [];
  }

  return uniqueTexts(
    Array.from(section.querySelectorAll("li"))
      .map((element) => normalizeText(element.textContent))
      .filter((text) => text.length >= 20)
      .filter((text) => !/seguidores|followers|conexoes|connections/i.test(text))
      .map((text) => truncateText(text, MAX_EXPERIENCE_LENGTH)),
  ).slice(0, 6);
}

export function extractLinkedInProfileFromDocument(root: Document): ExtractedLinkedInProfile {
  const topCard = getTopCard(root);
  const name = getFirstText(topCard, ["h1", ".pv-text-details__left-panel h1"]) || getFirstText(root, ["main h1", "h1"]) || extractNameFromTitle(root);
  const headlineCandidates = [
    getFirstText(topCard, [
      ".text-body-medium.break-words",
      ".text-body-medium",
      ".break-words",
      ".pv-text-details__left-panel .text-body-medium",
    ]),
    ...Array.from(topCard.querySelectorAll("span[aria-hidden='true'], .text-body-medium, .break-words"))
      .map((element) => normalizeText(element.textContent))
      .filter(Boolean),
    extractHeadlineFromTitle(root, name),
  ];
  const headline = headlineCandidates
    .map((candidate) => cleanHeadline(candidate, name))
    .find(Boolean) || "";
  const aboutSection = findSection(root, "about", /^(sobre|about)$/i);
  const experienceSection = findSection(root, "experience", /experi[eê]ncia|experience/i);
  const aboutText = truncateText(extractAboutText(aboutSection), MAX_EXPERIENCE_LENGTH);
  const experiences = uniqueTexts([
    aboutText,
    ...extractExperienceTexts(experienceSection),
  ]).slice(0, 6);

  return {
    name,
    headline,
    experiences,
  };
}