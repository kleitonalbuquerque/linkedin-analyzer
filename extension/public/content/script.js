(() => {
function normalizeText(value) {
  return String(value || "")
    .replaceAll(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, " ")
    .replaceAll(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "")
    .normalize("NFC")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function uniqueTexts(values) {
  return [
    ...new Set(values.map((value) => normalizeText(value)).filter(Boolean)),
  ];
}

function hasMeaningfulLetters(value) {
  return /[A-Za-zÀ-ÿ]/.test(value);
}

const MAX_EXPERIENCE_LENGTH = 900;
const PROFILE_CAPTURE_VERSION = "profile-capture-v3";
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
const SECONDARY_HEADLINE_METADATA_PATTERN =
  /seguidores|followers|conexoes|connections|contact info/i;
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
const EDITORIAL_HEADLINE_PREFIXES = [
  "a ",
  "o ",
  "as ",
  "os ",
  "como ",
  "por que ",
  "porque ",
  "why ",
  "how ",
  "the ",
];
const JOB_REFERENCE_PATTERN =
  /\(([a-z]{2,}[\d-]{3,}|[a-z]+\d{4,}|[a-z]{1,4}\d{5,})\)$/i;
const SOCIAL_PROOF_HEADLINE_PATTERN =
  /(?:^|\s)(?:me ajudou a conseguir (?:este|esse) emprego|helped me get this job)(?:$|\s)/i;
const SOCIAL_CONTEXT_HEADLINE_PATTERN =
  /(?:\be mais (?:\d{1,3}(?:[.,]\d{3})+|\d+) pessoas?\b|\band (?:\d{1,3}(?:[.,]\d{3})+|\d+) other people\b|\bmutual connections?\b|\bconex(?:ao|ões|oes) em comum\b|\bfollows? you\b|\bsegue voce\b)/i;
const EXPERIENCE_DATE_TEXT_PATTERN =
  /\b(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|jan\.|feb|mar\.|apr|may|jun\.|jul\.|aug|sep|sept|oct|nov\.|dec|presente|present|momento|atual|atualmente|de|of)\s+\d{4}\b|\b\d+\s+(?:ano|anos|mes|meses|mês|year|years|month|months)\b/i;
const EXPERIENCE_ACTION_TEXT_PATTERN =
  /\b(?:atuei|atuo|desenvolvi|desenvolvo|criei|crio|implementei|implemento|liderei|lidero|coordenei|coordeno|mantive|mantenho|otimizei|otimizo|contribui|contribuo|respons[aá]vel|foco|manuten[cç][aã]o|sustenta[cç][aã]o|arquitetura|integra[cç][aã]o|performance|produto|projeto|squad|api|apis)\b/i;
const EXPERIENCE_ENTRY_FALLBACK_SELECTOR =
  "[componentkey], [role='button'], article";
const EXPERIENCE_TEXT_LEAF_SELECTOR = "p, span[aria-hidden='true']";
const EXPERIENCE_TEXT_NOISE_PATTERN =
  /^(experi[eê]ncia|experience|mostrar todas|show all|exibir todas|ver todas|adicionar|dispon[ií]vel para|comece j[aá]|dados de contato|mais de \d+ conex(?:ões|oes)|\d+ notifica(?:ção|ções|cao|coes))$/i;
const EXPERIENCE_ENTRY_SELECTORS =
  ".pvs-list__paged-list-item, .artdeco-list__item, [data-view-name*='profile-component-entity'], .pvs-entity";
const SECTION_CONTAINER_SELECTORS =
  "section, article, .artdeco-card, .pvs-list, .pvs-list__container, div[id]";
const TOP_CARD_CONTAINER_SELECTOR = ".pv-top-card, section, .artdeco-card";
const EXPLICIT_TOP_CARD_SELECTOR =
  "[componentkey*='Topcard'], [componentkey*='topcard'], .pv-top-card";
const TOP_CARD_HEADLINE_SELECTOR =
  ".text-body-medium.break-words, .pv-text-details__left-panel .text-body-medium, .text-body-medium, .break-words";
const VISIBLE_TEXT_LEAF_SELECTOR = "span[aria-hidden='true'], p";

function stripCountPrefix(value) {
  return value.replaceAll(/^\d+[\d.,k]*\s+/gi, "");
}

function isMetadataHeadline(value) {
  const normalized = stripCountPrefix(normalizeText(value))
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return (
    HEADLINE_METADATA_TERMS.has(normalized) ||
    SOCIAL_PROOF_HEADLINE_PATTERN.test(normalized)
  );
}

function normalizeHeadlineToken(value) {
  return stripCountPrefix(normalizeText(value))
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasProfessionalHeadlineSignal(value) {
  const normalized = normalizeHeadlineToken(value);

  return PROFESSIONAL_HEADLINE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );
}

function isLikelyExternalHeadline(value) {
  const normalized = normalizeHeadlineToken(value);
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

  if (
    EXTERNAL_HEADLINE_SOURCE_TERMS.some((term) => normalized.includes(term))
  ) {
    return true;
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const startsLikeEditorialTitle = EDITORIAL_HEADLINE_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix),
  );
  const hasEditorialShape =
    (value.includes("?") || value.includes(":")) && words.length >= 7;

  return (
    words.length >= 8 &&
    !hasProfessionalHeadlineSignal(value) &&
    (startsLikeEditorialTitle || hasEditorialShape)
  );
}

function getFirstText(selectors, root = document) {
  for (const selector of selectors) {
    const text = normalizeText(root.querySelector(selector)?.textContent);

    if (text) {
      return text;
    }
  }

  return "";
}

function isUsableProfileName(value) {
  const normalized = normalizeHeadlineToken(value);

  return Boolean(value) &&
    hasMeaningfulLetters(value) &&
    !PROFILE_SECTION_HEADING_PATTERN.test(value) &&
    !HEADLINE_METADATA_TERMS.has(normalized);
}

function getProfileSlug() {
  return document.location?.pathname.match(/^\/in\/([^/]+)/i)?.[1]?.toLowerCase() || "";
}

function getProfileSlugFromHref(href) {
  try {
    return new URL(href, document.location.href).pathname.match(/^\/in\/([^/]+)/i)?.[1]?.toLowerCase() || "";
  } catch {
    return "";
  }
}

function hasMatchingProfileLink(element) {
  const link = element.closest('a[href*="/in/"]');

  if (!link) {
    return false;
  }

  const currentSlug = getProfileSlug();
  const linkSlug = getProfileSlugFromHref(link.href);

  return Boolean(linkSlug && (!currentSlug || linkSlug === currentSlug));
}

function getExplicitTopCard() {
  const topCard = document.querySelector(EXPLICIT_TOP_CARD_SELECTOR);

  if (!topCard) {
    return null;
  }

  if (topCard.matches(TOP_CARD_CONTAINER_SELECTOR)) {
    return topCard;
  }

  return (
    topCard.querySelector(TOP_CARD_CONTAINER_SELECTOR) ||
    topCard.closest(TOP_CARD_CONTAINER_SELECTOR) ||
    topCard
  );
}

function getProfileNameElement(topCard = getExplicitTopCard()) {
  const titleName = extractNameFromTitle();
  const searchRoots = [topCard, document].filter(Boolean);

  for (const searchRoot of searchRoots) {
    const candidates = Array.from(searchRoot.querySelectorAll("h1, h2")).filter(
      (element) => isUsableProfileName(normalizeText(element.textContent)),
    );
    const matchingProfileLink = candidates.find(hasMatchingProfileLink);

    if (matchingProfileLink) {
      return matchingProfileLink;
    }

    const titleMatch = candidates.find(
      (element) => titleName && normalizeText(element.textContent) === titleName,
    );

    if (titleMatch) {
      return titleMatch;
    }

    if (candidates.length) {
      return candidates[0];
    }
  }

  return null;
}

function getTopCard(nameElement = null) {
  const explicitTopCard = getExplicitTopCard();

  if (explicitTopCard) {
    return explicitTopCard;
  }

  if (nameElement) {
    const name = normalizeText(nameElement.textContent);
    const ancestors = [];
    let currentElement = nameElement.parentElement;

    while (currentElement && currentElement !== document.body) {
      ancestors.push(currentElement);

      if (currentElement.matches(TOP_CARD_CONTAINER_SELECTOR)) {
        break;
      }

      currentElement = currentElement.parentElement;
    }

    return (
      ancestors.find((ancestor) =>
        Array.from(ancestor.querySelectorAll(TOP_CARD_HEADLINE_SELECTOR)).some(
          (candidate) => {
            const text = normalizeText(candidate.textContent);

            return (
              text &&
              text !== name &&
              hasMeaningfulLetters(text) &&
              !PROFILE_SECTION_HEADING_PATTERN.test(text) &&
              !SECONDARY_HEADLINE_METADATA_PATTERN.test(text)
            );
          },
        ),
      ) ||
      nameElement.closest(TOP_CARD_CONTAINER_SELECTOR) ||
      nameElement.parentElement ||
      document.querySelector("main") ||
      document.body
    );
  }

  return null;
}

function getNearbyHeadlineCandidates(nameElement, topCard) {
  if (!nameElement || !topCard) {
    return [];
  }

  const candidateElements = Array.from(
    topCard.querySelectorAll("span[aria-hidden='true'], div, p"),
  );

  return uniqueTexts(
    candidateElements
      .filter((element) => {
        if (
          element === nameElement ||
          element.contains(nameElement) ||
          nameElement.contains(element)
        ) {
          return false;
        }

        if (element.closest("button, [role='button'], nav")) {
          return false;
        }

        return Boolean(
          nameElement.compareDocumentPosition(element) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        );
      })
      .map((element) => normalizeText(element.textContent))
      .filter(
        (text) => text.length <= 220 && hasProfessionalHeadlineSignal(text),
      ),
  );
}

function cleanHeadline(value, name) {
  if (!value) {
    return "";
  }

  return (
    value
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
      ) || ""
  );
}

function extractNameFromTitle() {
  const normalizedTitle = normalizeText(document.title);

  if (!normalizedTitle) {
    return "";
  }

  const [firstSegment] = normalizedTitle
    .split(/\s+-\s+|\|/)
    .map((segment) => normalizeText(segment));

  return firstSegment && hasMeaningfulLetters(firstSegment) ? firstSegment : "";
}

function extractHeadlineFromTitle(name) {
  const normalizedTitle = normalizeText(document.title);

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

  return roleSegment &&
    hasMeaningfulLetters(roleSegment) &&
    !isLikelyExternalHeadline(roleSegment) &&
    !PROFILE_SECTION_HEADING_PATTERN.test(roleSegment)
    ? roleSegment
    : "";
}

function isExperienceDetailsPage() {
  return /\/in\/[^/]+\/details\/experience\/?/i.test(
    document.location?.pathname || "",
  );
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trim()}...`;
}

function getLeafElements(root, selector) {
  return Array.from(root.querySelectorAll(selector)).filter(
    (element) => !element.querySelector(selector),
  );
}

function findSectionByHeading(pattern) {
  const headings = Array.from(
    document.querySelectorAll("main h1, main h2, main h3, main h4, h1, h2, h3, h4"),
  );

  for (const heading of headings) {
    if (!pattern.test(normalizeText(heading.textContent))) {
      continue;
    }

    return heading.closest(SECTION_CONTAINER_SELECTORS) || heading.parentElement || null;
  }

  return null;
}

function findSection(idFragment, headingPattern) {
  const byId = document.querySelector(
    `section[id*="${idFragment}"], article[id*="${idFragment}"], div[id*="${idFragment}"]`,
  );

  if (byId) {
    return byId.closest(SECTION_CONTAINER_SELECTORS) || byId;
  }

  return findSectionByHeading(headingPattern);
}

function findExperienceSection() {
  if (isExperienceDetailsPage()) {
    return document.querySelector("main") || document.body;
  }

  return findSection("experience", /experi[eê]ncia|experience/i);
}

function getLeafExperienceElements(section) {
  return getLeafElements(section, EXPERIENCE_ENTRY_SELECTORS);
}

function getLeafExperienceListItems(section) {
  return getLeafElements(section, "li");
}

function isMeaningfulExperienceFragment(text) {
  return (
    text.length >= 2 &&
    !/^(experi[eê]ncia|experience)$/i.test(text) &&
    !/^(tempo integral|full-time|part-time|integral|meio periodo)$/i.test(text)
  );
}

function isExperienceNoiseText(text) {
  return EXPERIENCE_TEXT_NOISE_PATTERN.test(normalizeText(text));
}

function isLikelyExperienceText(text) {
  const normalized = normalizeText(text);

  return (
    normalized.length >= 20 &&
    !isExperienceNoiseText(normalized) &&
    !SOCIAL_CONTEXT_HEADLINE_PATTERN.test(normalized) &&
    (hasProfessionalHeadlineSignal(normalized) ||
      EXPERIENCE_DATE_TEXT_PATTERN.test(normalized) ||
      EXPERIENCE_ACTION_TEXT_PATTERN.test(normalized))
  );
}

function isLikelyExperienceTitleText(text) {
  const normalized = normalizeText(text);

  return (
    normalized.length <= 120 &&
    hasProfessionalHeadlineSignal(normalized) &&
    !EXPERIENCE_DATE_TEXT_PATTERN.test(normalized) &&
    !EXPERIENCE_ACTION_TEXT_PATTERN.test(normalized)
  );
}

function extractExperienceText(element) {
  const visibleLeafFragments = uniqueTexts(
    getLeafElements(element, VISIBLE_TEXT_LEAF_SELECTOR).map((node) =>
      normalizeText(node.textContent),
    ),
  ).filter(isMeaningfulExperienceFragment);

  if (visibleLeafFragments.length) {
    return truncateText(
      visibleLeafFragments.join(" | "),
      MAX_EXPERIENCE_LENGTH,
    );
  }

  return truncateText(normalizeText(element.textContent), MAX_EXPERIENCE_LENGTH);
}

function getFallbackExperienceElements(section) {
  const candidates = Array.from(
    section.querySelectorAll(EXPERIENCE_ENTRY_FALLBACK_SELECTOR),
  )
    .filter((element) => element !== section)
    .filter((element) => isLikelyExperienceText(extractExperienceText(element)));

  return candidates.filter(
    (candidate) =>
      !candidates.some((other) => other !== candidate && candidate.contains(other)),
  );
}

function extractFallbackExperienceTexts(section) {
  const fallbackElements = getFallbackExperienceElements(section);

  if (fallbackElements.length) {
    return fallbackElements.map((element) => extractExperienceText(element));
  }

  const textFragments = uniqueTexts(
    getLeafElements(section, EXPERIENCE_TEXT_LEAF_SELECTOR)
      .map((element) => normalizeText(element.textContent))
      .filter((text) => text.length >= 2 && !isExperienceNoiseText(text)),
  );
  const groups = [];
  let currentGroup = [];

  for (const fragment of textFragments) {
    const startsNewExperience =
      isLikelyExperienceTitleText(fragment) &&
      currentGroup.some(
        (item) =>
          EXPERIENCE_DATE_TEXT_PATTERN.test(item) ||
          EXPERIENCE_ACTION_TEXT_PATTERN.test(item),
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
    .map((group) =>
      truncateText(uniqueTexts(group).join(" | "), MAX_EXPERIENCE_LENGTH),
    )
    .filter(isLikelyExperienceText);
}

function extractExperienceTexts(section) {
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
      : Array.from(section.querySelectorAll(EXPERIENCE_ENTRY_SELECTORS));
  const primaryTexts = sourceElements
    .map((element) => extractExperienceText(element))
    .filter((text) => text.length >= 20)
    .filter(
      (text) => !/seguidores|followers|conexoes|connections/i.test(text),
    )
    .filter((text) => !/^(experi[eê]ncia|experience)$/i.test(text));
  const fallbackTexts = primaryTexts.length
    ? []
    : extractFallbackExperienceTexts(section);

  return uniqueTexts([...primaryTexts, ...fallbackTexts]);
}

function hasExperienceDetailsLink() {
  return Boolean(document.querySelector('a[href*="/details/experience"]'));
}

function getProfileData() {
  const explicitTopCard = getExplicitTopCard();
  const nameElement = getProfileNameElement(explicitTopCard);
  const topCard = getTopCard(nameElement);
  const name = topCard
    ? normalizeText(nameElement?.textContent) ||
      getFirstText(["h1", "h2", ".pv-text-details__left-panel h1", ".pv-text-details__left-panel h2"], topCard) ||
      extractNameFromTitle()
    : extractNameFromTitle();
  const experienceSection = findExperienceSection();
  const topCardHeadlineCandidates = topCard
    ? [
        ...(nameElement ? getNearbyHeadlineCandidates(nameElement, topCard) : []),
        getFirstText(
          [
            ".text-body-medium.break-words",
            ".text-body-medium",
            ".break-words",
            ".pv-text-details__left-panel .text-body-medium",
          ],
          topCard,
        ),
        ...Array.from(
          topCard.querySelectorAll(
            "span[aria-hidden='true'], .text-body-medium, .break-words",
          ),
        )
          .map((element) => normalizeText(element.textContent))
          .filter(Boolean),
      ]
    : [];
  const headlineCandidates = [
    ...topCardHeadlineCandidates,
    extractHeadlineFromTitle(name),
  ];
  const headline =
    headlineCandidates
      .map((candidate) => cleanHeadline(candidate, name))
      .find(Boolean) || "";
  const experiences = uniqueTexts(extractExperienceTexts(experienceSection));

  return {
    name,
    headline,
    experiences,
    captureVersion: PROFILE_CAPTURE_VERSION,
    ...(hasExperienceDetailsLink() ? { hasMoreExperienceDetails: true } : {}),
  };
}

const CONTENT_SCRIPT_STATE_KEY = "__linkedinAnalyzerContentScriptState";
const previousState = globalThis[CONTENT_SCRIPT_STATE_KEY];

if (previousState?.listener) {
  chrome.runtime.onMessage.removeListener(previousState.listener);
}

console.info("[LinkedIn Analyzer] Content script loaded");

const profileMessageListener = (request, sender, sendResponse) => {
  if (request.type === "GET_PROFILE") {
    const profile = getProfileData();
    console.info("[LinkedIn Analyzer] GET_PROFILE received", profile);
    sendResponse(profile);
  }
};

chrome.runtime.onMessage.addListener(profileMessageListener);

globalThis[CONTENT_SCRIPT_STATE_KEY] = {
  version: PROFILE_CAPTURE_VERSION,
  listener: profileMessageListener,
};
})();
