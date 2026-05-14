import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputDir = path.join(rootDir, "store-assets");
const iconPath = path.join(rootDir, "public", "icons", "icon-128.png");

function parseOptions(argv) {
  let suffix = "";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--suffix") {
      const nextValue = argv[index + 1];

      if (!nextValue || nextValue.startsWith("--")) {
        throw new Error("Expected a value after --suffix");
      }

      suffix = nextValue;
      index += 1;
      continue;
    }

    if (arg.startsWith("--suffix=")) {
      suffix = arg.slice("--suffix=".length);
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  const normalizedSuffix = suffix.trim().replace(/^-+/, "");

  if (!normalizedSuffix) {
    return { suffix: "" };
  }

  if (!/^[a-z0-9][a-z0-9-]*$/i.test(normalizedSuffix)) {
    throw new Error(
      "Asset suffix must use only letters, numbers, and hyphens.",
    );
  }

  return { suffix: normalizedSuffix };
}

function appendSuffix(fileName, suffix) {
  if (!suffix) {
    return fileName;
  }

  const extension = path.extname(fileName);
  const baseName = fileName.slice(0, -extension.length);

  return `${baseName}-${suffix}${extension}`;
}

const palette = {
  ink: "#0f172a",
  slate: "#334155",
  muted: "#64748b",
  white: "#ffffff",
  border: "rgba(15, 23, 42, 0.10)",
  teal: "#0f766e",
  cyan: "#0ea5e9",
  green: "#059669",
  amber: "#f59e0b",
  red: "#dc2626",
  surface: "#f8fafc",
  surfaceStrong: "#e0f2fe",
  linkedIn: "#0a66c2",
};

const profile = {
  level: "Pleno",
  focus: "Posicionamento",
  score: 82,
  benchmark:
    "Headline clara e alinhada ao mercado, com boa densidade de palavras-chave.",
  benchmarkCompact:
    "Headline alinhada ao mercado e boa densidade de palavras-chave.",
  summary:
    "O perfil mostra boa base de experiencia, mas pode ganhar mais impacto com resultados mensuraveis.",
  summaryCompact:
    "Boa base de experiencia, com espaco para reforcar resultados mensuraveis.",
  strengths: [
    "Headline objetiva e relevante para recrutadores.",
    "Experiencias mostram progressao de carreira.",
    "Perfil transmite foco em produto e crescimento.",
  ],
  problems: [
    "Poucos indicadores de resultado nas experiencias.",
    "Projetos relevantes nao aparecem com clareza.",
    "Resumo profissional poderia ser mais estrategico.",
  ],
  strengthsCompact: [
    "Headline objetiva e relevante.",
    "Experiencias mostram progressao.",
  ],
  problemsCompact: [
    "Resultados pouco mensuraveis.",
    "Projetos ainda sem destaque.",
  ],
};

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapLines(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function estimateChars(width, divisor = 9.2, minimum = 12) {
  return Math.max(minimum, Math.floor(width / divisor));
}

function textBlock({
  x,
  y,
  lines,
  fontSize,
  lineHeight,
  fill,
  weight = 400,
  anchor = "start",
  opacity = 1,
}) {
  return lines
    .map((line, index) => {
      const dy = index * lineHeight;
      return `<text x="${x}" y="${y + dy}" fill="${fill}" font-size="${fontSize}" font-weight="${weight}" font-family="Segoe UI, Arial, sans-serif" text-anchor="${anchor}" opacity="${opacity}">${escapeXml(line)}</text>`;
    })
    .join("\n");
}

function pill({ x, y, width, label, fill, textFill }) {
  return `
    <rect x="${x}" y="${y}" width="${width}" height="30" rx="15" fill="${fill}" />
    <text x="${x + width / 2}" y="${y + 20}" fill="${textFill}" font-size="12" font-weight="700" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">${escapeXml(label)}</text>
  `;
}

function bulletList({ items, x, y, width, markerColor, textColor }) {
  return items
    .map((item, index) => {
      const lines = wrapLines(item, Math.max(18, Math.floor(width / 8.2)));
      const top = y + index * 44;

      return `
        <circle cx="${x + 8}" cy="${top + 10}" r="4" fill="${markerColor}" />
        ${textBlock({ x: x + 22, y: top + 14, lines, fontSize: 13, lineHeight: 18, fill: textColor })}
      `;
    })
    .join("\n");
}

function popupCard({ x, y, width, height, mode = "summary" }) {
  const pad = 26;
  const titleWidth = width - pad * 2;
  const heroTitle = wrapLines(
    "Diagnostico de perfil com score de mercado",
    estimateChars(titleWidth, 10.5, 20),
  );
  const heroCopy = wrapLines(
    "Capture o perfil aberto no LinkedIn, gere sugestoes com IA e exporte um PDF do resultado.",
    estimateChars(titleWidth, 9.8, 24),
  );
  const titleLineHeight = 34;
  const copyLineHeight = 21;
  const titleStartY = y + 74;
  const copyStartY = titleStartY + heroTitle.length * titleLineHeight + 14;
  const actionsY = copyStartY + heroCopy.length * copyLineHeight + 18;
  const contentY = actionsY + 82;
  const contentHeight = height - (contentY - y) - 24;
  const contentWidth = width - pad * 2;
  const innerX = x + pad;
  const analysisX = innerX;
  const analysisY = contentY;
  const analysisWidth = contentWidth;
  const analysisHeight = contentHeight;
  const benchmarkWidth = Math.floor((analysisWidth - 30) / 2);
  const summaryX = analysisX + 18 + benchmarkWidth + 18;
  const benchmarkLines = wrapLines(
    profile.benchmarkCompact,
    estimateChars(benchmarkWidth, 8.8, 12),
  );
  const summaryLines = wrapLines(
    profile.summaryCompact,
    estimateChars(benchmarkWidth, 8.8, 12),
  );
  const buttonWidth = Math.floor((width - pad * 2 - 12) / 2);

  const base = `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="28" fill="rgba(255,255,255,0.94)" stroke="${palette.border}" />
      <rect x="${x + 1}" y="${y + 1}" width="${width - 2}" height="${height - 2}" rx="27" fill="url(#cardGlow)" opacity="0.65" />
      ${textBlock({ x: x + pad, y: y + 36, lines: ["LINKEDIN ANALYZER"], fontSize: 12, lineHeight: 16, fill: palette.amber, weight: 800 })}
      ${textBlock({ x: x + pad, y: titleStartY, lines: heroTitle, fontSize: 28, lineHeight: titleLineHeight, fill: palette.ink, weight: 800 })}
      ${textBlock({ x: x + pad, y: copyStartY, lines: heroCopy, fontSize: 15, lineHeight: copyLineHeight, fill: palette.slate })}
      <rect x="${x + pad}" y="${actionsY}" width="${buttonWidth}" height="48" rx="14" fill="url(#buttonPrimary)" />
      <text x="${x + pad + Math.floor(buttonWidth / 2)}" y="${actionsY + 30}" fill="${palette.white}" font-size="15" font-weight="700" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">Analisar perfil</text>
      <rect x="${x + width / 2 + 6}" y="${actionsY}" width="${buttonWidth}" height="48" rx="14" fill="${palette.surface}" stroke="${palette.border}" />
      <text x="${x + width / 2 + 6 + Math.floor(buttonWidth / 2)}" y="${actionsY + 30}" fill="${palette.ink}" font-size="15" font-weight="700" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">Exportar PDF</text>
    </g>
  `;

  if (mode === "landing") {
    return `${base}
      <g opacity="0.78">
        <rect x="${analysisX}" y="${analysisY}" width="${analysisWidth}" height="${Math.min(118, analysisHeight)}" rx="20" fill="${palette.surface}" stroke="rgba(14,165,233,0.12)" stroke-dasharray="8 8" />
        ${textBlock({ x: analysisX + 26, y: analysisY + 49, lines: ["Abra um perfil do LinkedIn para gerar a analise."], fontSize: 18, lineHeight: 26, fill: palette.slate, weight: 600 })}
        ${textBlock({ x: analysisX + 26, y: analysisY + 82, lines: ["A extensao captura nome, headline e experiencias visiveis."], fontSize: 14, lineHeight: 22, fill: palette.muted })}
      </g>`;
  }

  if (mode === "pdf") {
    return `${base}
      <g>
        <rect x="${analysisX}" y="${analysisY}" width="${analysisWidth}" height="${analysisHeight}" rx="22" fill="url(#analysisBg)" stroke="rgba(14,165,233,0.12)" />
        ${textBlock({ x: analysisX + 18, y: analysisY + 36, lines: ["Relatorio pronto para exportacao"], fontSize: 15, lineHeight: 20, fill: palette.muted, weight: 700 })}
        <text x="${analysisX + 18}" y="${analysisY + 96}" fill="${palette.ink}" font-size="62" font-weight="800" font-family="Segoe UI, Arial, sans-serif">${profile.score}</text>
        ${pill({ x: analysisX + 102, y: analysisY + 58, width: 78, label: profile.level, fill: "rgba(245,158,11,0.18)", textFill: palette.ink })}
        ${pill({ x: analysisX + 190, y: analysisY + 58, width: 132, label: profile.focus, fill: "#d1fae5", textFill: "#064e3b" })}
        ${textBlock({ x: analysisX + 18, y: analysisY + 142, lines: wrapLines("PDF com score, benchmark e sugestoes prioritarias para revisao rapida.", estimateChars(analysisWidth - 160, 9, 18)), fontSize: 15, lineHeight: 22, fill: palette.slate })}
        <rect x="${analysisX + analysisWidth - 132}" y="${analysisY + 42}" width="110" height="148" rx="16" fill="${palette.white}" stroke="rgba(15,23,42,0.08)" />
        <rect x="${analysisX + analysisWidth - 114}" y="${analysisY + 64}" width="74" height="10" rx="5" fill="${palette.surfaceStrong}" />
        <rect x="${analysisX + analysisWidth - 114}" y="${analysisY + 86}" width="58" height="8" rx="4" fill="rgba(15,118,110,0.16)" />
        <rect x="${analysisX + analysisWidth - 114}" y="${analysisY + 114}" width="84" height="8" rx="4" fill="rgba(15,23,42,0.08)" />
        <rect x="${analysisX + analysisWidth - 114}" y="${analysisY + 134}" width="78" height="8" rx="4" fill="rgba(15,23,42,0.08)" />
        <rect x="${analysisX + analysisWidth - 114}" y="${analysisY + 154}" width="66" height="8" rx="4" fill="rgba(15,23,42,0.08)" />
      </g>`;
  }

  if (mode === "showcase") {
    return `${base}
      <g>
        <rect x="${analysisX}" y="${analysisY}" width="${analysisWidth}" height="${Math.min(analysisHeight, 126)}" rx="22" fill="url(#analysisBg)" stroke="rgba(14,165,233,0.12)" />
        <text x="${analysisX + 18}" y="${analysisY + 42}" fill="${palette.muted}" font-size="13" font-weight="800" font-family="Segoe UI, Arial, sans-serif">Score</text>
        <text x="${analysisX + 18}" y="${analysisY + 106}" fill="${palette.ink}" font-size="64" font-weight="800" font-family="Segoe UI, Arial, sans-serif">${profile.score}</text>
        ${pill({ x: analysisX + 114, y: analysisY + 66, width: 78, label: profile.level, fill: "rgba(245,158,11,0.18)", textFill: palette.ink })}
        ${pill({ x: analysisX + 204, y: analysisY + 66, width: 132, label: profile.focus, fill: "#d1fae5", textFill: "#064e3b" })}
      </g>`;
  }

  if (mode === "insights") {
    return `${base}
      <g>
        <rect x="${analysisX}" y="${analysisY}" width="${analysisWidth}" height="${analysisHeight}" rx="22" fill="url(#analysisBg)" stroke="rgba(14,165,233,0.12)" />
        <text x="${analysisX + 18}" y="${analysisY + 64}" fill="${palette.ink}" font-size="56" font-weight="800" font-family="Segoe UI, Arial, sans-serif">${profile.score}</text>
        ${pill({ x: analysisX + 104, y: analysisY + 32, width: 78, label: profile.level, fill: "rgba(245,158,11,0.18)", textFill: palette.ink })}
        ${pill({ x: analysisX + 192, y: analysisY + 32, width: 132, label: profile.focus, fill: "#d1fae5", textFill: "#064e3b" })}
        ${textBlock({ x: analysisX + 18, y: analysisY + 108, lines: ["Pontos fortes"], fontSize: 13, lineHeight: 16, fill: palette.muted, weight: 800 })}
        ${bulletList({ items: profile.strengthsCompact, x: analysisX + 10, y: analysisY + 124, width: benchmarkWidth - 8, markerColor: palette.green, textColor: palette.ink })}
        ${textBlock({ x: summaryX, y: analysisY + 108, lines: ["Problemas"], fontSize: 13, lineHeight: 16, fill: palette.muted, weight: 800 })}
        ${bulletList({ items: profile.problemsCompact, x: summaryX - 8, y: analysisY + 124, width: benchmarkWidth - 8, markerColor: palette.red, textColor: palette.ink })}
      </g>`;
  }

  return `${base}
    <g>
      <rect x="${analysisX}" y="${analysisY}" width="${analysisWidth}" height="${analysisHeight}" rx="22" fill="url(#analysisBg)" stroke="rgba(14,165,233,0.12)" />
      <text x="${analysisX + 18}" y="${analysisY + 44}" fill="${palette.muted}" font-size="13" font-weight="800" font-family="Segoe UI, Arial, sans-serif">Score</text>
      <text x="${analysisX + 18}" y="${analysisY + 112}" fill="${palette.ink}" font-size="68" font-weight="800" font-family="Segoe UI, Arial, sans-serif">${profile.score}</text>
      ${pill({ x: analysisX + 124, y: analysisY + 66, width: 78, label: profile.level, fill: "rgba(245,158,11,0.18)", textFill: palette.ink })}
      ${pill({ x: analysisX + 214, y: analysisY + 66, width: 132, label: profile.focus, fill: "#d1fae5", textFill: "#064e3b" })}
      ${textBlock({ x: analysisX + 18, y: analysisY + 148, lines: ["Benchmark"], fontSize: 13, lineHeight: 16, fill: palette.muted, weight: 800 })}
      ${textBlock({ x: analysisX + 18, y: analysisY + 174, lines: benchmarkLines, fontSize: 13, lineHeight: 19, fill: palette.ink })}
      ${textBlock({ x: summaryX, y: analysisY + 148, lines: ["Resumo"], fontSize: 13, lineHeight: 16, fill: palette.muted, weight: 800 })}
      ${textBlock({ x: summaryX, y: analysisY + 174, lines: summaryLines, fontSize: 13, lineHeight: 19, fill: palette.ink })}
    </g>`;
}

function decorativeBackground(width, height) {
  return `
    <rect width="${width}" height="${height}" fill="url(#pageBg)" />
    <circle cx="${width - 120}" cy="${Math.max(100, Math.floor(height * 0.16))}" r="160" fill="rgba(14,165,233,0.12)" />
    <circle cx="${Math.floor(width * 0.14)}" cy="${height - 80}" r="210" fill="rgba(15,118,110,0.14)" />
    <circle cx="${Math.floor(width * 0.58)}" cy="${height - 40}" r="110" fill="rgba(245,158,11,0.14)" />
    <path d="M ${width * 0.72} ${height * 0.08} C ${width * 0.86} ${height * 0.16}, ${width * 0.94} ${height * 0.28}, ${width * 0.98} ${height * 0.54}" fill="none" stroke="rgba(15,23,42,0.08)" stroke-width="2" stroke-dasharray="10 14" />
  `;
}

function withFrame({ width, height, body }) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="pageBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#eff6ff" />
          <stop offset="48%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color="#ecfeff" />
        </linearGradient>
        <linearGradient id="buttonPrimary" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette.teal}" />
          <stop offset="100%" stop-color="${palette.cyan}" />
        </linearGradient>
        <linearGradient id="analysisBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(240,249,255,0.95)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0.98)" />
        </linearGradient>
        <linearGradient id="cardGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.35)" />
          <stop offset="100%" stop-color="rgba(14,165,233,0.12)" />
        </linearGradient>
        <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="20" stdDeviation="22" flood-color="rgba(15,23,42,0.18)" />
        </filter>
      </defs>
      ${body}
    </svg>
  `;
}

function heroText({ x, y, title, subtitle, chips = [], showChips = true }) {
  const titleLines = wrapLines(title, 24);
  const subtitleLines = wrapLines(subtitle, 42);
  const titleStartY = y + 44;
  const titleLineHeight = 54;
  const subtitleStartY = titleStartY + titleLines.length * titleLineHeight + 18;
  const subtitleLineHeight = 30;
  const chipsY =
    subtitleStartY + subtitleLines.length * subtitleLineHeight + 22;
  const chipsMarkup = showChips
    ? chips
        .map((item, index) =>
          pill({
            x: x + index * 164,
            y: chipsY,
            width: 148,
            label: item,
            fill: "rgba(255,255,255,0.72)",
            textFill: palette.ink,
          }),
        )
        .join("\n")
    : "";

  return `
    ${textBlock({ x, y, lines: ["LinkedIn Analyzer"], fontSize: 14, lineHeight: 18, fill: palette.linkedIn, weight: 800 })}
    ${textBlock({ x, y: titleStartY, lines: titleLines, fontSize: 46, lineHeight: titleLineHeight, fill: palette.ink, weight: 800 })}
    ${textBlock({ x, y: subtitleStartY, lines: subtitleLines, fontSize: 20, lineHeight: subtitleLineHeight, fill: palette.slate })}
    ${chipsMarkup}
  `;
}

function screenshotOverview() {
  const width = 1280;
  const height = 800;

  return withFrame({
    width,
    height,
    body: `
      ${decorativeBackground(width, height)}
      <rect x="48" y="52" width="1184" height="696" rx="34" fill="rgba(255,255,255,0.68)" stroke="rgba(255,255,255,0.72)" />
      ${heroText({
        x: 112,
        y: 140,
        title: "Analise um perfil aberto no LinkedIn em segundos.",
        subtitle:
          "Capture nome, headline e experiencias visiveis para gerar um diagnostico com score de mercado e orientacao pratica.",
        chips: ["Score de mercado", "Sugestoes com IA", "PDF exportavel"],
      })}
      ${popupCard({ x: 726, y: 106, width: 430, height: 572, mode: "landing" })}
      <g>
        <circle cx="152" cy="560" r="8" fill="${palette.teal}" />
        ${textBlock({ x: 174, y: 566, lines: ["Use o popup em qualquer perfil publico do LinkedIn."], fontSize: 18, lineHeight: 24, fill: palette.ink, weight: 600 })}
        <circle cx="152" cy="610" r="8" fill="${palette.cyan}" />
        ${textBlock({ x: 174, y: 616, lines: ["A leitura acontece apenas quando voce inicia a analise."], fontSize: 18, lineHeight: 24, fill: palette.ink, weight: 600 })}
        <circle cx="152" cy="660" r="8" fill="${palette.amber}" />
        ${textBlock({ x: 174, y: 666, lines: ["O resultado volta em formato objetivo e pronto para revisar."], fontSize: 18, lineHeight: 24, fill: palette.ink, weight: 600 })}
      </g>
    `,
  });
}

function screenshotScore() {
  const width = 1280;
  const height = 800;

  return withFrame({
    width,
    height,
    body: `
      ${decorativeBackground(width, height)}
      <rect x="48" y="52" width="1184" height="696" rx="34" fill="rgba(255,255,255,0.68)" stroke="rgba(255,255,255,0.72)" />
      ${heroText({
        x: 100,
        y: 132,
        title: "Veja score, benchmark e foco principal sem sair da pagina.",
        subtitle:
          "A interface resume o posicionamento do perfil e destaca o que merece ajuste imediato para melhorar clareza e impacto.",
        chips: ["Benchmark", "Resumo executivo", "Nivel estimado"],
        showChips: false,
      })}
      ${popupCard({ x: 730, y: 100, width: 430, height: 590, mode: "summary" })}
      <g>
        <rect x="100" y="486" width="500" height="172" rx="26" fill="rgba(255,255,255,0.84)" stroke="rgba(15,23,42,0.08)" />
        ${textBlock({ x: 134, y: 536, lines: ["Exemplo de leitura"], fontSize: 14, lineHeight: 18, fill: palette.muted, weight: 800 })}
        ${textBlock({ x: 134, y: 580, lines: wrapLines("Perfil com boa base de experiencia, headline alinhada e espaco claro para reforcar resultados com numeros.", 48), fontSize: 22, lineHeight: 30, fill: palette.ink, weight: 700 })}
      </g>
    `,
  });
}

function screenshotInsights() {
  const width = 1280;
  const height = 800;

  return withFrame({
    width,
    height,
    body: `
      ${decorativeBackground(width, height)}
      <rect x="48" y="52" width="1184" height="696" rx="34" fill="rgba(255,255,255,0.68)" stroke="rgba(255,255,255,0.72)" />
      ${heroText({
        x: 96,
        y: 126,
        title: "Priorize os ajustes com pontos fortes, problemas e sugestoes.",
        subtitle:
          "O resultado separa sinais positivos, lacunas e recomendacoes praticas para orientar a proxima revisao do perfil.",
        chips: ["Pontos fortes", "Problemas", "Sugestoes"],
        showChips: false,
      })}
      ${popupCard({ x: 736, y: 98, width: 420, height: 594, mode: "insights" })}
      <g>
        <rect x="96" y="478" width="246" height="170" rx="24" fill="rgba(255,255,255,0.88)" stroke="rgba(15,23,42,0.08)" />
        ${textBlock({ x: 126, y: 520, lines: ["1. Reforce impacto"], fontSize: 24, lineHeight: 30, fill: palette.ink, weight: 800 })}
        ${textBlock({ x: 126, y: 558, lines: wrapLines("Inclua resultados mensuraveis nas experiencias mais recentes.", 20), fontSize: 16, lineHeight: 24, fill: palette.slate })}
        <rect x="370" y="478" width="246" height="170" rx="24" fill="rgba(255,255,255,0.88)" stroke="rgba(15,23,42,0.08)" />
        ${textBlock({ x: 400, y: 520, lines: ["2. Destaque projetos"], fontSize: 24, lineHeight: 30, fill: palette.ink, weight: 800 })}
        ${textBlock({ x: 400, y: 558, lines: wrapLines("Mostre iniciativas relevantes com contexto e resultado.", 20), fontSize: 16, lineHeight: 24, fill: palette.slate })}
      </g>
    `,
  });
}

function screenshotPdf() {
  const width = 1280;
  const height = 800;

  return withFrame({
    width,
    height,
    body: `
      ${decorativeBackground(width, height)}
      <rect x="48" y="52" width="1184" height="696" rx="34" fill="rgba(255,255,255,0.68)" stroke="rgba(255,255,255,0.72)" />
      ${heroText({
        x: 104,
        y: 132,
        title: "Exporte um PDF para compartilhar ou revisar depois.",
        subtitle:
          "Depois da analise, o relatorio consolida score, benchmark, problemas e sugestoes prioritarias em um formato facil de circular.",
        chips: ["Relatorio rapido", "PDF exportavel", "Uso profissional"],
        showChips: false,
      })}
      ${popupCard({ x: 720, y: 104, width: 438, height: 586, mode: "pdf" })}
      <g filter="url(#cardShadow)">
        <rect x="170" y="448" width="276" height="200" rx="24" fill="rgba(255,255,255,0.92)" />
        <rect x="194" y="476" width="118" height="14" rx="7" fill="${palette.surfaceStrong}" />
        <rect x="194" y="506" width="82" height="10" rx="5" fill="rgba(245,158,11,0.20)" />
        <rect x="194" y="536" width="204" height="10" rx="5" fill="rgba(15,23,42,0.10)" />
        <rect x="194" y="560" width="188" height="10" rx="5" fill="rgba(15,23,42,0.10)" />
        <rect x="194" y="584" width="166" height="10" rx="5" fill="rgba(15,23,42,0.10)" />
        <text x="194" y="628" fill="${palette.teal}" font-size="18" font-weight="800" font-family="Segoe UI, Arial, sans-serif">PDF pronto para download</text>
      </g>
    `,
  });
}

function screenshotPrivacy() {
  const width = 1280;
  const height = 800;

  return withFrame({
    width,
    height,
    body: `
      ${decorativeBackground(width, height)}
      <rect x="48" y="52" width="1184" height="696" rx="34" fill="rgba(255,255,255,0.68)" stroke="rgba(255,255,255,0.72)" />
      ${heroText({
        x: 104,
        y: 124,
        title: "Voce controla quando a analise comeca.",
        subtitle:
          "A extensao so envia dados visiveis do perfil depois que voce clica em Analisar perfil.",
        chips: ["Acao manual", "Dados visiveis", "Uso transparente"],
        showChips: false,
      })}
      <g>
        <rect x="104" y="478" width="238" height="170" rx="24" fill="rgba(255,255,255,0.88)" stroke="rgba(15,23,42,0.08)" />
        <circle cx="138" cy="520" r="18" fill="rgba(15,118,110,0.14)" />
        <path d="M 130 520 L 136 526 L 148 512" fill="none" stroke="${palette.teal}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
        ${textBlock({ x: 128, y: 562, lines: ["Antes do clique"], fontSize: 22, lineHeight: 28, fill: palette.ink, weight: 800 })}
        ${textBlock({ x: 128, y: 598, lines: wrapLines("Nenhum diagnostico e iniciado automaticamente.", 22), fontSize: 16, lineHeight: 23, fill: palette.slate })}
        <rect x="370" y="478" width="238" height="170" rx="24" fill="rgba(255,255,255,0.88)" stroke="rgba(15,23,42,0.08)" />
        <circle cx="404" cy="520" r="18" fill="rgba(14,165,233,0.14)" />
        <rect x="397" y="516" width="14" height="14" rx="3" fill="none" stroke="${palette.cyan}" stroke-width="4" />
        <path d="M 400 516 V 510 C 400 504, 408 504, 408 510 V 516" fill="none" stroke="${palette.cyan}" stroke-width="4" stroke-linecap="round" />
        ${textBlock({ x: 394, y: 562, lines: ["Dados visiveis"], fontSize: 22, lineHeight: 28, fill: palette.ink, weight: 800 })}
        ${textBlock({ x: 394, y: 598, lines: wrapLines("A leitura usa apenas informacoes exibidas no perfil aberto.", 22), fontSize: 16, lineHeight: 23, fill: palette.slate })}
      </g>
      <g filter="url(#cardShadow)">
        <rect x="716" y="104" width="442" height="586" rx="30" fill="rgba(255,255,255,0.94)" stroke="${palette.border}" />
        <rect x="717" y="105" width="440" height="584" rx="29" fill="url(#cardGlow)" opacity="0.65" />
        ${textBlock({ x: 746, y: 142, lines: ["LINKEDIN ANALYZER"], fontSize: 12, lineHeight: 16, fill: palette.amber, weight: 800 })}
        ${textBlock({ x: 746, y: 196, lines: wrapLines("Envio iniciado somente por voce", 22), fontSize: 30, lineHeight: 38, fill: palette.ink, weight: 800 })}
        ${textBlock({ x: 746, y: 284, lines: wrapLines("Revise o perfil aberto e comece a analise quando fizer sentido.", 34), fontSize: 16, lineHeight: 24, fill: palette.slate })}
        <rect x="746" y="340" width="382" height="174" rx="24" fill="url(#analysisBg)" stroke="rgba(14,165,233,0.12)" />
        <circle cx="786" cy="390" r="20" fill="rgba(15,118,110,0.14)" />
        <path d="M 778 390 L 784 396 L 796 382" fill="none" stroke="${palette.teal}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
        ${textBlock({ x: 824, y: 396, lines: ["Perfil aberto no LinkedIn"], fontSize: 16, lineHeight: 22, fill: palette.ink, weight: 700 })}
        <circle cx="786" cy="438" r="20" fill="rgba(14,165,233,0.14)" />
        <path d="M 778 438 L 784 444 L 796 430" fill="none" stroke="${palette.cyan}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
        ${textBlock({ x: 824, y: 444, lines: ["Nome, headline e experiencias"], fontSize: 16, lineHeight: 22, fill: palette.ink, weight: 700 })}
        <circle cx="786" cy="486" r="20" fill="rgba(245,158,11,0.16)" />
        <path d="M 778 486 L 784 492 L 796 478" fill="none" stroke="${palette.amber}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
        ${textBlock({ x: 824, y: 492, lines: ["Analise enviada apos o clique"], fontSize: 16, lineHeight: 22, fill: palette.ink, weight: 700 })}
        <rect x="746" y="552" width="182" height="50" rx="15" fill="url(#buttonPrimary)" />
        <text x="837" y="583" fill="${palette.white}" font-size="15" font-weight="700" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">Analisar perfil</text>
        <rect x="944" y="552" width="184" height="50" rx="15" fill="${palette.surface}" stroke="${palette.border}" />
        <text x="1036" y="583" fill="${palette.ink}" font-size="15" font-weight="700" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">Exportar PDF</text>
      </g>
    `,
  });
}

function promoSmall(iconDataUri) {
  const width = 440;
  const height = 280;

  return withFrame({
    width,
    height,
    body: `
      ${decorativeBackground(width, height)}
      <rect x="18" y="18" width="404" height="244" rx="26" fill="rgba(255,255,255,0.78)" stroke="rgba(255,255,255,0.72)" />
      <image href="${iconDataUri}" x="34" y="34" width="48" height="48" />
      ${textBlock({ x: 96, y: 56, lines: ["LinkedIn Analyzer"], fontSize: 18, lineHeight: 22, fill: palette.linkedIn, weight: 800 })}
      ${textBlock({ x: 34, y: 106, lines: wrapLines("Diagnostico de perfil com score de mercado", 21), fontSize: 28, lineHeight: 34, fill: palette.ink, weight: 800 })}
      ${textBlock({ x: 34, y: 196, lines: wrapLines("Sugestoes com IA e PDF exportavel para revisar o perfil com mais clareza.", 29), fontSize: 15, lineHeight: 22, fill: palette.slate })}
      <rect x="282" y="146" width="118" height="88" rx="20" fill="rgba(255,255,255,0.95)" stroke="rgba(15,23,42,0.08)" />
      <text x="302" y="188" fill="${palette.ink}" font-size="34" font-weight="800" font-family="Segoe UI, Arial, sans-serif">82</text>
      <rect x="338" y="164" width="44" height="18" rx="9" fill="rgba(245,158,11,0.18)" />
      <text x="360" y="177" fill="${palette.ink}" font-size="9" font-weight="800" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">Pleno</text>
    `,
  });
}

function promoMarquee(iconDataUri) {
  const width = 1400;
  const height = 560;

  return withFrame({
    width,
    height,
    body: `
      ${decorativeBackground(width, height)}
      <rect x="30" y="30" width="1340" height="500" rx="36" fill="rgba(255,255,255,0.74)" stroke="rgba(255,255,255,0.72)" />
      <image href="${iconDataUri}" x="90" y="88" width="74" height="74" />
      ${textBlock({ x: 184, y: 136, lines: ["LinkedIn Analyzer"], fontSize: 26, lineHeight: 32, fill: palette.linkedIn, weight: 800 })}
      ${textBlock({ x: 90, y: 220, lines: wrapLines("Diagnostico de perfil com score de mercado para melhorar seu posicionamento no LinkedIn.", 38), fontSize: 54, lineHeight: 62, fill: palette.ink, weight: 800 })}
      ${textBlock({ x: 90, y: 386, lines: wrapLines("Analise o perfil aberto, receba sugestoes com IA e exporte um PDF com os pontos prioritarios da revisao.", 56), fontSize: 24, lineHeight: 34, fill: palette.slate })}
      ${pill({ x: 90, y: 434, width: 168, label: "Score de mercado", fill: "rgba(255,255,255,0.78)", textFill: palette.ink })}
      ${pill({ x: 272, y: 434, width: 152, label: "Sugestoes com IA", fill: "rgba(255,255,255,0.78)", textFill: palette.ink })}
      ${pill({ x: 438, y: 434, width: 152, label: "PDF exportavel", fill: "rgba(255,255,255,0.78)", textFill: palette.ink })}
      <g filter="url(#cardShadow)">
        ${popupCard({ x: 876, y: 56, width: 430, height: 448, mode: "showcase" })}
      </g>
    `,
  });
}

async function writeAsset(fileName, svgMarkup) {
  const targetSvg = path.join(outputDir, fileName.replace(/\.png$/, ".svg"));
  const targetPng = path.join(outputDir, fileName);

  await fs.writeFile(targetSvg, svgMarkup, "utf8");
  await sharp(Buffer.from(svgMarkup))
    .flatten({ background: palette.white })
    .png()
    .toFile(targetPng);
}

async function main() {
  const { suffix } = parseOptions(process.argv.slice(2));

  await fs.mkdir(outputDir, { recursive: true });

  const iconBuffer = await fs.readFile(iconPath);
  const iconDataUri = `data:image/png;base64,${iconBuffer.toString("base64")}`;

  const assets = [
    ["screenshot-01-overview.png", screenshotOverview()],
    ["screenshot-02-score.png", screenshotScore()],
    ["screenshot-03-insights.png", screenshotInsights()],
    ["screenshot-04-pdf.png", screenshotPdf()],
    ["screenshot-05-privacy.png", screenshotPrivacy()],
    ["promo-small-440x280.png", promoSmall(iconDataUri)],
    ["promo-marquee-1400x560.png", promoMarquee(iconDataUri)],
  ];

  await Promise.all(
    assets.map(([fileName, svgMarkup]) =>
      writeAsset(appendSuffix(fileName, suffix), svgMarkup),
    ),
  );

  const suffixLabel = suffix ? ` with suffix "${suffix}"` : "";
  console.log(
    `Generated ${assets.length} store assets${suffixLabel} in ${outputDir}`,
  );
}

try {
  await main();
} catch (error) {
  console.error("Failed to generate store assets", error);
  process.exitCode = 1;
}
