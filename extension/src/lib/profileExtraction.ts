export type ExtractedLinkedInProfile = {
  name?: string;
  headline?: string;
  experiences?: string[];
};

const MAX_EXPERIENCE_LENGTH = 900;
const MAX_CAPTURED_EXPERIENCES = 10;
const INVISIBLE_FORMAT_CHARACTER_PATTERN = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const HEADLINE_METADATA_TERMS = new Set([
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
const EDITORIAL_HEADLINE_PREFIXES = ["a ", "o ", "as ", "os ", "como ", "por que ", "porque ", "why ", "how ", "the "];
const JOB_REFERENCE_PATTERN = /\(([a-z]{2,}[\d-]{3,}|[a-z]+\d{4,}|[a-z]{1,4}\d{5,})\)$/i;
const SOCIAL_PROOF_HEADLINE_PATTERN = /(?:^|\s)(?:me ajudou a conseguir (?:este|esse) emprego|helped me get this job)(?:$|\s)/i;
const SOCIAL_CONTEXT_HEADLINE_PATTERN =
  /(?:\be mais (?:\d{1,3}(?:[.,]\d{3})+|\d+) pessoas?\b|\band (?:\d{1,3}(?:[.,]\d{3})+|\d+) other people\b|\bmutual connections?\b|\bconex(?:ao|ões|oes) em comum\b|\bfollows? you\b|\bsegue voce\b)/i;
const EXPERIENCE_ENTRY_SELECTORS = ".pvs-list__paged-list-item, .artdeco-list__item, [data-view-name*='profile-component-entity'], .pvs-entity";
const SECTION_CONTAINER_SELECTORS = "section, article, .artdeco-card, .pvs-list, .pvs-list__container, div[id]";
const VISIBLE_TEXT_LEAF_SELECTOR = "span[aria-hidden='true']";

function stripCountPrefix(value: string) {
  return value.replaceAll(/^\d+[\d.,k]*\s+/gi, "");
}

function normalizeText(value?: string | null) {
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
  const trimmedValue = normalizeText(value);

  if (!normalized || !hasMeaningfulLetters(value)) {
    return false;
  }

  if (JOB_REFERENCE_PATTERN.test(trimmedValue)) {
    return true;
  }

  if (SOCIAL_PROOF_HEADLINE_PATTERN.test(trimmedValue)) {
    return true;
  }

  if (SOCIAL_CONTEXT_HEADLINE_PATTERN.test(trimmedValue)) {
    return true;
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
  const normalized = normalizeMetadataToken(value);

  return HEADLINE_METADATA_TERMS.has(normalized) || SOCIAL_PROOF_HEADLINE_PATTERN.test(normalized);
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
        !SOCIAL_CONTEXT_HEADLINE_PATTERN.test(part) &&
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

function getLeafElements(root: ParentNode, selector: string) {
  return Array.from(root.querySelectorAll<HTMLElement>(selector))
    .filter((element) => !element.querySelector(selector));
}

function findSectionByHeading(root: Document, pattern: RegExp) {
  const headings = Array.from(root.querySelectorAll("main h1, main h2, main h3, main h4, h1, h2, h3, h4"));

  for (const heading of headings) {
    if (!pattern.test(normalizeText(heading.textContent))) {
      continue;
    }

    return heading.closest(SECTION_CONTAINER_SELECTORS) || heading.parentElement || null;
  }

  return null;
}

function findSection(root: Document, idFragment: string, headingPattern: RegExp) {
  const byId = root.querySelector(`section[id*="${idFragment}"], article[id*="${idFragment}"], div[id*="${idFragment}"]`);

  if (byId) {
    return byId.closest(SECTION_CONTAINER_SELECTORS) || byId;
  }

  return findSectionByHeading(root, headingPattern);
}

function extractAboutParagraphs(section: Element | null) {
  if (!section) {
    return [];
  }

  return uniqueTexts(
    Array.from(section.querySelectorAll("span[aria-hidden='true'], p, .inline-show-more-text"))
      .map((element) => normalizeText(element.textContent)),
  )
    .filter((text) => text.length >= 40 && !/^(sobre|about)$/i.test(text));
}

function buildHeadlineFromAbout(aboutParagraphs: string[], name: string) {
  const normalized = normalizeText(aboutParagraphs.join(" "));

  if (!normalized) {
    return "";
  }

  return normalized !== name && hasMeaningfulLetters(normalized) ? normalized : "";
}

function getLeafExperienceElements(section: Element) {
  return getLeafElements(section, EXPERIENCE_ENTRY_SELECTORS);
}

function getLeafExperienceListItems(section: Element) {
  return getLeafElements(section, "li");
}

function isMeaningfulExperienceFragment(text: string) {
  return text.length >= 2
    && !/^(experi[eê]ncia|experience)$/i.test(text)
    && !/^(tempo integral|full-time|part-time|integral|meio periodo)$/i.test(text);
}

function extractExperienceText(element: HTMLElement) {
  const visibleLeafFragments = uniqueTexts(
    getLeafElements(element, VISIBLE_TEXT_LEAF_SELECTOR)
      .map((node) => normalizeText(node.textContent)),
  ).filter(isMeaningfulExperienceFragment);

  if (visibleLeafFragments.length) {
    return truncateText(visibleLeafFragments.join(" | "), MAX_EXPERIENCE_LENGTH);
  }

  return truncateText(normalizeText(element.textContent), MAX_EXPERIENCE_LENGTH);
}

function extractExperienceTexts(section: Element | null) {
  if (!section) {
    return [];
  }

  const leafListItems = getLeafExperienceListItems(section);
  const leafExperienceElements = getLeafExperienceElements(section);
  const granularListItemElements = leafListItems.flatMap((item) => {
    const nestedExperienceElements = getLeafExperienceElements(item);

    return nestedExperienceElements.length ? nestedExperienceElements : [item];
  });
  const sourceElements = granularListItemElements.length
    ? granularListItemElements
    : leafExperienceElements.length
      ? leafExperienceElements
      : Array.from(section.querySelectorAll<HTMLElement>(EXPERIENCE_ENTRY_SELECTORS));

  return uniqueTexts(
    sourceElements
      .map((element) => extractExperienceText(element))
      .filter((text) => text.length >= 20)
      .filter((text) => !/seguidores|followers|conexoes|connections/i.test(text))
      .filter((text) => !/^(experi[eê]ncia|experience)$/i.test(text))
  ).slice(0, MAX_CAPTURED_EXPERIENCES);
}

export function extractLinkedInProfileFromDocument(root: Document): ExtractedLinkedInProfile {
  const topCard = getTopCard(root);
  const name = getFirstText(topCard, ["h1", ".pv-text-details__left-panel h1"]) || getFirstText(root, ["main h1", "h1"]) || extractNameFromTitle(root);
  const aboutSection = findSection(root, "about", /^(sobre|about)$/i);
  const experienceSection = findSection(root, "experience", /experi[eê]ncia|experience/i);
  const aboutParagraphs = extractAboutParagraphs(aboutSection);
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
  const extractedHeadline = headlineCandidates
    .map((candidate) => cleanHeadline(candidate, name))
    .find(Boolean) || "";
  const headline = buildHeadlineFromAbout(aboutParagraphs, name) || extractedHeadline;
  const experiences = uniqueTexts(extractExperienceTexts(experienceSection)).slice(0, MAX_CAPTURED_EXPERIENCES);

  return {
    name,
    headline,
    experiences,
  };
}
