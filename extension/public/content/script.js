function normalizeText(value) {
  return String(value || "")
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

const MAX_EXPERIENCE_LENGTH = 280;
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

function stripCountPrefix(value) {
  return value.replaceAll(/^\d+[\d.,k]*\s+/gi, "");
}

function isMetadataHeadline(value) {
  return HEADLINE_METADATA_TERMS.has(
    stripCountPrefix(normalizeText(value))
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036f]/g, "")
      .toLowerCase(),
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

  if (!normalized || !hasMeaningfulLetters(value)) {
    return false;
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

function getTopCard() {
  const nameElement = document.querySelector("main h1, h1");

  if (nameElement) {
    return (
      nameElement.closest("section, div") ||
      nameElement.parentElement ||
      document.querySelector("main") ||
      document.body
    );
  }

  return document.querySelector("main") || document.body;
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

  const firstRelevantSegment = segments.find(
    (segment) => segment !== name && !/linkedin/i.test(segment),
  );

  const roleSegment = firstRelevantSegment?.includes(" - ")
    ? normalizeText(firstRelevantSegment.split(" - ").slice(1).join(" - "))
    : firstRelevantSegment;

  return roleSegment &&
    hasMeaningfulLetters(roleSegment) &&
    !isLikelyExternalHeadline(roleSegment)
    ? roleSegment
    : "";
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trim()}...`;
}

function findSectionByHeading(pattern) {
  const sections = Array.from(
    document.querySelectorAll("main section, section"),
  );

  return (
    sections.find((section) => {
      const heading = getFirstText(["h1", "h2", "h3"], section);
      return pattern.test(heading);
    }) || null
  );
}

function findSection(idFragment, headingPattern) {
  const byId = document
    .querySelector(`section[id*="${idFragment}"], div[id*="${idFragment}"]`)
    ?.closest("section");

  if (byId) {
    return byId;
  }

  return findSectionByHeading(headingPattern);
}

function extractAboutText(section) {
  if (!section) {
    return "";
  }

  const candidates = uniqueTexts(
    Array.from(
      section.querySelectorAll(
        "span[aria-hidden='true'], p, .inline-show-more-text",
      ),
    ).map((element) => normalizeText(element.textContent)),
  );

  return (
    candidates.find(
      (text) => text.length >= 40 && !/^(sobre|about)$/i.test(text),
    ) || ""
  );
}

function extractExperienceTexts(section) {
  if (!section) {
    return [];
  }

  return uniqueTexts(
    Array.from(section.querySelectorAll("li"))
      .map((element) => normalizeText(element.textContent))
      .filter((text) => text.length >= 20)
      .filter(
        (text) => !/seguidores|followers|conexoes|connections/i.test(text),
      )
      .map((text) => truncateText(text, MAX_EXPERIENCE_LENGTH)),
  ).slice(0, 6);
}

function getProfileData() {
  const topCard = getTopCard();
  const name =
    getFirstText(["h1", ".pv-text-details__left-panel h1"], topCard) ||
    getFirstText(["main h1", "h1"]) ||
    extractNameFromTitle();
  const headlineCandidates = [
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
    extractHeadlineFromTitle(name),
  ];
  const headline =
    headlineCandidates
      .map((candidate) => cleanHeadline(candidate, name))
      .find(Boolean) || "";
  const aboutSection = findSection("about", /^(sobre|about)$/i);
  const experienceSection = findSection(
    "experience",
    /experi[eê]ncia|experience/i,
  );
  const experiences = uniqueTexts([
    truncateText(extractAboutText(aboutSection), MAX_EXPERIENCE_LENGTH),
    ...extractExperienceTexts(experienceSection),
  ]).slice(0, 6);

  return { name, headline, experiences };
}

console.info("[LinkedIn Analyzer] Content script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_PROFILE") {
    const profile = getProfileData();
    console.info("[LinkedIn Analyzer] GET_PROFILE received", profile);
    sendResponse(profile);
  }
});
