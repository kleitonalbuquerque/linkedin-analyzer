export type ExtractedLinkedInProfile = {
  name?: string;
  headline?: string;
  experiences?: string[];
};

const MAX_EXPERIENCE_LENGTH = 280;

function normalizeText(value?: string | null) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function uniqueTexts(values: string[]) {
  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))];
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

  const parts = value
    .split(/\n|\u00b7/)
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .filter((part) => part !== name)
    .filter((part) => !/seguidores|followers|conexoes|connections|contact info/i.test(part));

  return parts[0] || "";
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
  const name = getFirstText(topCard, ["h1", ".pv-text-details__left-panel h1"]) || getFirstText(root, ["main h1", "h1"]);
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
  ];
  const headline = cleanHeadline(
    headlineCandidates.find((candidate) => candidate && candidate !== name) || "",
    name,
  );
  const aboutSection = findSection(root, "about", /^(sobre|about)$/i);
  const experienceSection = findSection(root, "experience", /experi[ee]ncia|experience/i);
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