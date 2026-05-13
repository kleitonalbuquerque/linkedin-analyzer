export type ExtractedLinkedInProfile = {
  name?: string;
  headline?: string;
  experiences?: string[];
  hasMoreExperienceDetails?: boolean;
};

const MAX_EXPERIENCE_LENGTH = 900;
const INVISIBLE_FORMAT_CHARACTER_PATTERN = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const PROFILE_SECTION_HEADING_PATTERN =
  /^(sobre|about|experi[eê]ncia|experience|forma[cç][aã]o|education|compet[eê]ncias|skills|certifica[cç][oõ]es|licenses|projetos|projects)$/i;
const HEADLINE_METADATA_TERMS = new Set([
  "live",
  "notificacao",
  "notificacoes",
  "notification",
  "notifications",
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
const EXPERIENCE_DATE_TEXT_PATTERN =
  /\b(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|jan\.|feb|mar\.|apr|may|jun\.|jul\.|aug|sep|sept|oct|nov\.|dec|presente|present|momento|atual|atualmente|de|of)\s+\d{4}\b|\b\d+\s+(?:ano|anos|mes|meses|mês|year|years|month|months)\b/i;
const EXPERIENCE_ACTION_TEXT_PATTERN =
  /\b(?:atuei|atuo|desenvolvi|desenvolvo|criei|crio|implementei|implemento|liderei|lidero|coordenei|coordeno|mantive|mantenho|otimizei|otimizo|contribui|contribuo|respons[aá]vel|foco|manuten[cç][aã]o|sustenta[cç][aã]o|arquitetura|integra[cç][aã]o|performance|produto|projeto|squad|api|apis)\b/i;
const EXPERIENCE_ENTRY_FALLBACK_SELECTOR = "[componentkey], [role='button'], article";
const EXPERIENCE_TEXT_LEAF_SELECTOR = "p, span[aria-hidden='true']";
const EXPERIENCE_TEXT_NOISE_PATTERN =
  /^(experi[eê]ncia|experience|mostrar todas|show all|exibir todas|ver todas|adicionar|dispon[ií]vel para|comece j[aá]|dados de contato|mais de \d+ conex(?:ões|oes)|\d+ notifica(?:ção|ções|cao|coes))$/i;
const EXPERIENCE_ENTRY_SELECTORS = ".pvs-list__paged-list-item, .artdeco-list__item, [data-view-name*='profile-component-entity'], .pvs-entity";
const SECTION_CONTAINER_SELECTORS = "section, article, .artdeco-card, .pvs-list, .pvs-list__container, div[id]";
const TOP_CARD_CONTAINER_SELECTOR = ".pv-top-card, section, .artdeco-card";
const EXPLICIT_TOP_CARD_SELECTOR = "[componentkey*='Topcard'], [componentkey*='topcard'], .pv-top-card";
const TOP_CARD_HEADLINE_SELECTOR = ".text-body-medium.break-words, .pv-text-details__left-panel .text-body-medium, .text-body-medium, .break-words";
const VISIBLE_TEXT_LEAF_SELECTOR = "span[aria-hidden='true'], p";

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

function isUsableProfileName(value: string) {
  const normalized = normalizeMetadataToken(value);

  return Boolean(value)
    && hasMeaningfulLetters(value)
    && !PROFILE_SECTION_HEADING_PATTERN.test(value)
    && !HEADLINE_METADATA_TERMS.has(normalized);
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

function getProfileSlug(root: Document) {
  return root.location?.pathname.match(/^\/in\/([^/]+)/i)?.[1]?.toLowerCase() || "";
}

function getProfileSlugFromHref(root: Document, href: string) {
  try {
    return new URL(href, root.location.href).pathname.match(/^\/in\/([^/]+)/i)?.[1]?.toLowerCase() || "";
  } catch {
    return "";
  }
}

function hasMatchingProfileLink(root: Document, element: HTMLElement) {
  const link = element.closest<HTMLAnchorElement>('a[href*="/in/"]');

  if (!link) {
    return false;
  }

  const currentSlug = getProfileSlug(root);
  const linkSlug = getProfileSlugFromHref(root, link.href);

  return linkSlug && (!currentSlug || linkSlug === currentSlug);
}

function getExplicitTopCard(root: Document) {
  const topCard = root.querySelector<HTMLElement>(EXPLICIT_TOP_CARD_SELECTOR);

  if (!topCard) {
    return null;
  }

  if (topCard.matches(TOP_CARD_CONTAINER_SELECTOR)) {
    return topCard;
  }

  return topCard.querySelector<HTMLElement>(TOP_CARD_CONTAINER_SELECTOR)
    || topCard.closest<HTMLElement>(TOP_CARD_CONTAINER_SELECTOR)
    || topCard;
}

function getProfileNameElement(root: Document, topCard: Element | null = getExplicitTopCard(root)) {
  const titleName = extractNameFromTitle(root);
  const searchRoots: ParentNode[] = topCard ? [topCard, root] : [root];

  for (const searchRoot of searchRoots) {
    const candidates = Array.from(searchRoot.querySelectorAll<HTMLElement>("h1, h2"))
      .filter((element) => isUsableProfileName(normalizeText(element.textContent)));
    const matchingProfileLink = candidates.find((element) => hasMatchingProfileLink(root, element));

    if (matchingProfileLink) {
      return matchingProfileLink;
    }

    const titleMatch = candidates.find((element) => titleName && normalizeText(element.textContent) === titleName);

    if (titleMatch) {
      return titleMatch;
    }

    if (candidates.length) {
      return candidates[0];
    }
  }

  return null;
}

function getTopCard(root: Document, nameElement: HTMLElement | null = null) {
  const explicitTopCard = getExplicitTopCard(root);

  if (explicitTopCard) {
    return explicitTopCard;
  }

  if (nameElement) {
    const name = normalizeText(nameElement.textContent);
    const ancestors: HTMLElement[] = [];
    let currentElement = nameElement.parentElement;

    while (currentElement && currentElement !== root.body) {
      ancestors.push(currentElement);

      if (currentElement.matches(TOP_CARD_CONTAINER_SELECTOR)) {
        break;
      }

      currentElement = currentElement.parentElement;
    }

    return ancestors.find((ancestor) =>
      Array.from(ancestor.querySelectorAll(TOP_CARD_HEADLINE_SELECTOR))
        .some((candidate) => {
          const text = normalizeText(candidate.textContent);

          return text
            && text !== name
            && hasMeaningfulLetters(text)
            && !PROFILE_SECTION_HEADING_PATTERN.test(text)
            && !SECONDARY_HEADLINE_METADATA_PATTERN.test(text);
        })
    ) || nameElement.closest(TOP_CARD_CONTAINER_SELECTOR) || nameElement.parentElement || root.querySelector("main") || root.body;
  }

  return null;
}

function getNearbyHeadlineCandidates(nameElement: HTMLElement, topCard: Element) {
  const candidateElements = Array.from(
    topCard.querySelectorAll<HTMLElement>("span[aria-hidden='true'], div, p"),
  );

  return uniqueTexts(candidateElements
    .filter((element) => {
      if (element === nameElement || element.contains(nameElement) || nameElement.contains(element)) {
        return false;
      }

      if (element.closest("button, [role='button'], nav")) {
        return false;
      }

      return Boolean(nameElement.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
    })
    .map((element) => normalizeText(element.textContent))
    .filter((text) => text.length <= 220 && hasProfessionalHeadlineSignal(text)));
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
  const roleSegment = segments
    .filter((segment) => segment !== name && !/linkedin/i.test(segment))
    .map((segment) => {
      if (segment.startsWith(`${name} - `)) {
        return normalizeText(segment.slice(name.length + 3));
      }

      return segment;
    })
    .filter((segment) => segment && segment !== name)
    .join(" | ");

  return roleSegment
    && hasMeaningfulLetters(roleSegment)
    && !isLikelyExternalHeadline(roleSegment)
    && !PROFILE_SECTION_HEADING_PATTERN.test(roleSegment)
    ? roleSegment
    : "";
}

function isExperienceDetailsPage(root: Document) {
  return /\/in\/[^/]+\/details\/experience\/?/i.test(root.location?.pathname || "");
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

function findExperienceSection(root: Document) {
  if (isExperienceDetailsPage(root)) {
    return root.querySelector("main") || root.body;
  }

  return findSection(root, "experience", /experi[eê]ncia|experience/i);
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

function isExperienceNoiseText(text: string) {
  return EXPERIENCE_TEXT_NOISE_PATTERN.test(normalizeText(text));
}

function isLikelyExperienceText(text: string) {
  const normalized = normalizeText(text);

  return normalized.length >= 20
    && !isExperienceNoiseText(normalized)
    && !SOCIAL_CONTEXT_HEADLINE_PATTERN.test(normalized)
    && (
      hasProfessionalHeadlineSignal(normalized)
      || EXPERIENCE_DATE_TEXT_PATTERN.test(normalized)
      || EXPERIENCE_ACTION_TEXT_PATTERN.test(normalized)
    );
}

function isLikelyExperienceTitleText(text: string) {
  const normalized = normalizeText(text);

  return normalized.length <= 120
    && hasProfessionalHeadlineSignal(normalized)
    && !EXPERIENCE_DATE_TEXT_PATTERN.test(normalized)
    && !EXPERIENCE_ACTION_TEXT_PATTERN.test(normalized);
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

function getFallbackExperienceElements(section: Element) {
  const candidates = Array.from(section.querySelectorAll<HTMLElement>(EXPERIENCE_ENTRY_FALLBACK_SELECTOR))
    .filter((element) => element !== section)
    .filter((element) => isLikelyExperienceText(extractExperienceText(element)));

  return candidates.filter(
    (candidate) => !candidates.some((other) => other !== candidate && candidate.contains(other)),
  );
}

function extractFallbackExperienceTexts(section: Element) {
  const fallbackElements = getFallbackExperienceElements(section);

  if (fallbackElements.length) {
    return fallbackElements.map((element) => extractExperienceText(element));
  }

  const textFragments = uniqueTexts(
    getLeafElements(section, EXPERIENCE_TEXT_LEAF_SELECTOR)
      .map((element) => normalizeText(element.textContent))
      .filter((text) => text.length >= 2 && !isExperienceNoiseText(text)),
  );
  const groups: string[][] = [];
  let currentGroup: string[] = [];

  for (const fragment of textFragments) {
    const startsNewExperience = isLikelyExperienceTitleText(fragment) && currentGroup.some((item) =>
      EXPERIENCE_DATE_TEXT_PATTERN.test(item) || EXPERIENCE_ACTION_TEXT_PATTERN.test(item),
    );

    if (startsNewExperience) {
      groups.push(currentGroup);
      currentGroup = [fragment];
      continue;
    }

    if (currentGroup.length || isLikelyExperienceText(fragment)) {
      currentGroup.push(fragment);
    }
  }

  if (currentGroup.length) {
    groups.push(currentGroup);
  }

  return groups
    .map((group) => truncateText(uniqueTexts(group).join(" | "), MAX_EXPERIENCE_LENGTH))
    .filter(isLikelyExperienceText);
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
  const primaryTexts = sourceElements
    .map((element) => extractExperienceText(element))
    .filter((text) => text.length >= 20)
    .filter((text) => !/seguidores|followers|conexoes|connections/i.test(text))
    .filter((text) => !/^(experi[eê]ncia|experience)$/i.test(text));
  const fallbackTexts = primaryTexts.length ? [] : extractFallbackExperienceTexts(section);

  return uniqueTexts([...primaryTexts, ...fallbackTexts]);
}

function hasExperienceDetailsLink(root: Document) {
  return Boolean(root.querySelector('a[href*="/details/experience"]'));
}

export function extractLinkedInProfileFromDocument(root: Document): ExtractedLinkedInProfile {
  const explicitTopCard = getExplicitTopCard(root);
  const nameElement = getProfileNameElement(root, explicitTopCard);
  const topCard = getTopCard(root, nameElement);
  const name = topCard
    ? normalizeText(nameElement?.textContent)
      || getFirstText(topCard, ["h1", "h2", ".pv-text-details__left-panel h1", ".pv-text-details__left-panel h2"])
      || extractNameFromTitle(root)
    : extractNameFromTitle(root);
  const experienceSection = findExperienceSection(root);
  const topCardHeadlineCandidates = topCard
    ? [
        ...(nameElement ? getNearbyHeadlineCandidates(nameElement, topCard) : []),
        getFirstText(topCard, [
          ".text-body-medium.break-words",
          ".text-body-medium",
          ".break-words",
          ".pv-text-details__left-panel .text-body-medium",
        ]),
        ...Array.from(topCard.querySelectorAll("span[aria-hidden='true'], .text-body-medium, .break-words"))
          .map((element) => normalizeText(element.textContent))
          .filter(Boolean),
      ]
    : [];
  const headlineCandidates = [
    ...topCardHeadlineCandidates,
    extractHeadlineFromTitle(root, name),
  ];
  const headline = headlineCandidates
    .map((candidate) => cleanHeadline(candidate, name))
    .find(Boolean) || "";
  const experiences = uniqueTexts(extractExperienceTexts(experienceSection));

  return {
    name,
    headline,
    experiences,
    ...(hasExperienceDetailsLink(root) ? { hasMoreExperienceDetails: true } : {}),
  };
}
