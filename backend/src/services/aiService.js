import Groq from "groq-sdk";

const DEFAULT_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const KEYWORDS = [
  "react",
  "node",
  "javascript",
  "typescript",
  "python",
  "java",
  "sql",
  "cloud",
  "aws",
  "azure",
  "docker",
  "kubernetes",
  "api",
  "produto",
  "growth",
  "dados",
  "analytics",
  "lideranca",
  "gestao",
  "sales",
  "marketing",
];

const FRONTEND_KEYWORDS = [
  "react",
  "vue",
  "angular",
  "frontend",
  "ux",
  "ui",
  "css",
  "html",
];
const BACKEND_KEYWORDS = [
  "node",
  "java",
  "python",
  "api",
  "sql",
  "backend",
  "microservices",
];
const DATA_KEYWORDS = [
  "dados",
  "analytics",
  "bi",
  "sql",
  "power bi",
  "machine learning",
];
const PRODUCT_KEYWORDS = [
  "produto",
  "roadmap",
  "discovery",
  "growth",
  "experimento",
  "stakeholders",
];
const LEADERSHIP_KEYWORDS = [
  "lider",
  "lideranca",
  "mentoria",
  "gestao",
  "team lead",
  "coordenacao",
];

export function normalizeProfile(data = {}) {
  const experiences = Array.isArray(data.experiences)
    ? data.experiences
        .map((experience) => String(experience).trim())
        .filter(Boolean)
    : [];

  return {
    name: typeof data.name === "string" ? data.name.trim() : "",
    headline: typeof data.headline === "string" ? data.headline.trim() : "",
    experiences,
  };
}

export function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function countKeywordHits(text) {
  const lowerText = text.toLowerCase();

  return KEYWORDS.filter((keyword) => lowerText.includes(keyword)).length;
}

export function countMatches(text, keywords) {
  const lowerText = text.toLowerCase();

  return keywords.filter((keyword) => lowerText.includes(keyword)).length;
}

export function countMeasuredResults(experiences) {
  return experiences.filter((experience) =>
    /\d|%|kpi|roi|mrr|sql|usuarios|clientes/i.test(experience),
  ).length;
}

export function scoreHeadline(headlineLength) {
  if (headlineLength >= 80 && headlineLength <= 220) {
    return 20;
  }

  if (headlineLength >= 40) {
    return 12;
  }

  if (headlineLength > 0) {
    return 5;
  }

  return 0;
}

export function scoreKeywords(keywordHits) {
  if (keywordHits >= 5) {
    return 20;
  }

  if (keywordHits >= 3) {
    return 14;
  }

  if (keywordHits >= 1) {
    return 8;
  }

  return 0;
}

export function scoreExperiences(experiencesCount) {
  if (experiencesCount >= 5) {
    return 20;
  }

  if (experiencesCount >= 3) {
    return 14;
  }

  if (experiencesCount >= 1) {
    return 8;
  }

  return 0;
}

export function scoreMeasuredResults(measuredResults) {
  if (measuredResults >= 3) {
    return 15;
  }

  if (measuredResults >= 1) {
    return 8;
  }

  return 0;
}

export function determineNivel(score, experiencesCount, leadershipHits) {
  if (score >= 85 || leadershipHits >= 2) {
    return experiencesCount >= 4 ? "Senior" : "Pleno";
  }

  if (score >= 65) {
    return "Pleno";
  }

  return "Junior";
}

export function determineFoco(combinedText) {
  const focusScores = [
    { nome: "Frontend", score: countMatches(combinedText, FRONTEND_KEYWORDS) },
    { nome: "Backend", score: countMatches(combinedText, BACKEND_KEYWORDS) },
    { nome: "Dados", score: countMatches(combinedText, DATA_KEYWORDS) },
    { nome: "Produto", score: countMatches(combinedText, PRODUCT_KEYWORDS) },
  ];

  const topFocus = focusScores.reduce(
    (best, current) => (current.score > best.score ? current : best),
    { nome: "Generalista", score: 0 },
  );

  return topFocus.score > 0 ? topFocus.nome : "Generalista";
}

export function pushIfMissing(list, item) {
  if (item && !list.includes(item)) {
    list.push(item);
  }
}

export function buildProblemas({
  headlineLength,
  keywordHits,
  measuredResults,
  experiencesCount,
  leadershipHits,
}) {
  const problemas = [];

  if (headlineLength < 40) {
    pushIfMissing(problemas, "Headline generica ou curta demais.");
  }

  if (keywordHits < 3) {
    pushIfMissing(
      problemas,
      "Poucas palavras-chave relevantes para buscas de recrutadores.",
    );
  }

  if (measuredResults < 1) {
    pushIfMissing(
      problemas,
      "Sem metricas claras de impacto nas experiencias.",
    );
  }

  if (experiencesCount < 3) {
    pushIfMissing(
      problemas,
      "Poucos projetos ou experiencias detalhadas no perfil.",
    );
  }

  if (leadershipHits < 1) {
    pushIfMissing(
      problemas,
      "Nao ha sinais claros de lideranca, mentoria ou ownership.",
    );
  }

  return problemas;
}

export function buildPontosFortes({
  foco,
  keywordHits,
  measuredResults,
  experiencesCount,
  leadershipHits,
}) {
  const pontosFortes = [];

  if (foco !== "Generalista") {
    pushIfMissing(pontosFortes, foco);
  }

  if (keywordHits >= 3) {
    pushIfMissing(pontosFortes, "Boa densidade de palavras-chave");
  }

  if (measuredResults >= 1) {
    pushIfMissing(pontosFortes, "Resultados com impacto mensuravel");
  }

  if (experiencesCount >= 3) {
    pushIfMissing(pontosFortes, "Historico profissional consistente");
  }

  if (leadershipHits >= 1) {
    pushIfMissing(pontosFortes, "Sinais de lideranca ou mentoria");
  }

  return pontosFortes.slice(0, 4);
}

export function buildPontosFracos({
  keywordHits,
  measuredResults,
  experiencesCount,
  leadershipHits,
}) {
  const pontosFracos = [];

  if (keywordHits < 3) {
    pushIfMissing(pontosFracos, "Palavras-chave insuficientes");
  }

  if (measuredResults < 1) {
    pushIfMissing(pontosFracos, "Falta de metricas de impacto");
  }

  if (experiencesCount < 3) {
    pushIfMissing(pontosFracos, "Poucos projetos detalhados");
  }

  if (leadershipHits < 1) {
    pushIfMissing(pontosFracos, "Sem evidencia de lideranca");
  }

  return pontosFracos.slice(0, 4);
}

export function buildBenchmark(score) {
  if (score >= 85) {
    return "Acima da media do mercado para perfis competitivos no LinkedIn.";
  }

  if (score >= 70) {
    return "Bom posicionamento para o mercado, mas ainda ha espaco para diferenciar melhor resultados e especialidades.";
  }

  if (score >= 55) {
    return "Na media do mercado. O perfil precisa ficar mais especifico para competir melhor por oportunidades.";
  }

  return "Abaixo da media do mercado. O perfil precisa de mais clareza, provas de impacto e palavras-chave relevantes.";
}

export function buildRuleBasedAnalysis(profile) {
  const headlineLength = profile.headline.length;
  const combinedText = [profile.headline, ...profile.experiences].join(" ");
  const keywordHits = countKeywordHits(combinedText);
  const measuredResults = countMeasuredResults(profile.experiences);
  const experiencesCount = profile.experiences.length;
  const leadershipHits = countMatches(combinedText, LEADERSHIP_KEYWORDS);
  const foco = determineFoco(combinedText);

  let score = 35;
  score += scoreHeadline(headlineLength);
  score += scoreKeywords(keywordHits);
  score += scoreExperiences(experiencesCount);
  score += scoreMeasuredResults(measuredResults);
  score += profile.name ? 5 : 0;

  const finalScore = clampScore(score);
  const nivel = determineNivel(finalScore, experiencesCount, leadershipHits);
  const benchmark = buildBenchmark(finalScore);
  const problemas = buildProblemas({
    headlineLength,
    keywordHits,
    measuredResults,
    experiencesCount,
    leadershipHits,
  });
  const pontosFortes = buildPontosFortes({
    foco,
    keywordHits,
    measuredResults,
    experiencesCount,
    leadershipHits,
  });
  const pontosFracos = buildPontosFracos({
    keywordHits,
    measuredResults,
    experiencesCount,
    leadershipHits,
  });

  const resumo = [
    finalScore >= 70
      ? "O perfil ja passa uma boa percepcao inicial para o mercado."
      : "O perfil ainda nao comunica bem o valor profissional para o mercado.",
    keywordHits >= 3
      ? "As palavras-chave ajudam na descoberta por recrutadores."
      : "Faltam palavras-chave que conectem a experiencia com as buscas mais comuns do mercado.",
    measuredResults >= 1
      ? "Ha sinais de impacto mensuravel nas experiencias listadas."
      : "As experiencias precisam mostrar mais resultados, numeros ou impacto concreto.",
  ].join(" ");

  const sugestoes = [
    headlineLength < 80
      ? "Reescreva o headline com cargo, especialidade e principal proposta de valor em uma frase objetiva."
      : "Ajuste o headline para destacar nicho, senioridade e diferencial competitivo com mais precisao.",
    keywordHits < 3
      ? "Inclua palavras-chave do seu mercado nas experiencias e no headline para melhorar a descoberta no LinkedIn."
      : "Distribua melhor as palavras-chave entre headline e experiencias para reforcar seu posicionamento.",
    measuredResults < 1
      ? "Descreva resultados com numeros, percentuais, clientes atendidos ou impacto em receita, prazo e eficiencia."
      : "Transforme mais experiencias em casos de impacto com contexto, acao e resultado mensuravel.",
    experiencesCount < 3
      ? "Adicione mais experiencias ou projetos relevantes para mostrar repertorio profissional."
      : "Priorize as experiencias mais relevantes e detalhe as entregas com foco em decisao, ownership e impacto.",
  ];

  return {
    nivel,
    score: finalScore,
    foco,
    pontosFortes,
    pontosFracos,
    problemas,
    benchmark,
    resumo,
    sugestoes: sugestoes.slice(0, 4),
    signals: {
      headlineLength,
      keywordHits,
      measuredResults,
      experiencesCount,
      leadershipHits,
    },
  };
}

export function extractJsonBlock(text) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);

  if (fencedMatch) {
    return fencedMatch[1];
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text;
}

export function sanitizeModelText(value, fallback = "") {
  const text = typeof value === "string" ? value.trim() : "";

  if (!text) {
    return fallback;
  }

  const brokenAmpersandMatches =
    text.match(/&(?=[\p{L}\p{N}.,:;!?()%/-])/gu) || [];
  const hasBrokenAmpersandEncoding =
    brokenAmpersandMatches.length >= 4 &&
    brokenAmpersandMatches.length / text.length > 0.08;

  const spacedTokens = text
    .split(/\s+/)
    .map((token) => token.replaceAll(/[.,:;!?()%/-]/g, ""))
    .filter(Boolean);
  const singleCharTokens = spacedTokens.filter((token) => token.length === 1);
  const hasSpacedCharacterCorruption =
    spacedTokens.length >= 8 &&
    singleCharTokens.length / spacedTokens.length > 0.6;

  if (hasSpacedCharacterCorruption) {
    return fallback;
  }

  const repaired = hasBrokenAmpersandEncoding ? text.replaceAll("&", "") : text;

  return repaired.replaceAll(/\s+/g, " ").trim() || fallback;
}

export function sanitizeList(values, fallback) {
  const list = Array.isArray(values)
    ? values.map((value) => sanitizeModelText(value)).filter(Boolean)
    : [];

  return list.length > 0 ? list.slice(0, 4) : fallback;
}

export function createGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new Groq({ apiKey });
}

export function buildGroqPrompt(profile, baseAnalysis) {
  return [
    "Voce e um especialista em LinkedIn, recrutamento e posicionamento profissional.",
    "Analise o perfil abaixo em portugues do Brasil.",
    "Use o score e os sinais calculados localmente apenas como referencia, sem repetir mecanicamente a analise local.",
    "Produza uma leitura especifica, baseada nas tecnologias, entregas, contexto de negocio e sinais explicitos do perfil.",
    "Nao use frases vagas como 'bom perfil', 'perfil competitivo' ou 'bom posicionamento' sem explicar o motivo com base em evidencias do texto.",
    "Tambem evite cliches como 'experiencia solida', 'profissional completo', 'perfil forte' ou 'bom potencial' sem ancoragem concreta.",
    "Priorize leitura de recrutador: clareza de posicionamento, senioridade percebida, densidade de palavras-chave, impacto mensuravel e coerencia entre headline e experiencias.",
    "Quando faltarem evidencias, aponte exatamente o que esta faltando, por exemplo: metricas, escopo, senioridade, ownership, lideranca, arquitetura ou resultados.",
    "Se o perfil tiver pouco sinal, diga isso claramente e torne as sugestoes mais especificas sobre o que falta escrever no LinkedIn.",
    "Nas listas, escreva itens concretos e especificos. Cite stacks, dominios, resultados, sinais de senioridade ou lacunas reais do perfil. Evite itens genericos demais.",
    "No resumo, sintetize como o perfil seria percebido por recrutadores, qual stack ou direcao profissional aparece com mais clareza e quais ajustes gerariam mais impacto.",
    "No benchmark, compare o perfil com o mercado em 1 ou 2 frases curtas, sempre explicando o motivo. Nunca devolva so um elogio generico.",
    "Benchmark ruim: 'Bom posicionamento para o mercado.'. Benchmark bom: 'Perfil bem alinhado para vagas de React e Node, mas ainda perde forca por falta de metricas e escopo tecnico explicito.'.",
    "Resumo ruim: 'Perfil competitivo e com boa experiencia.'. Resumo bom: 'O perfil comunica bem front-end com React e Next.js, mas pode reforcar senioridade com resultados, arquitetura e impacto mensuravel.'.",
    "Responda SOMENTE em JSON valido.",
    "Formato esperado:",
    '{"nivel":"Junior|Pleno|Senior","foco":"Frontend|Backend|Dados|UX|UI|Cloud|SRE|DBA|Cyber Segurança|Produto|Finanças|Gastronomia|Marketing|Administração|Saúde|Enfermagem|Medicina|Educação|Pesquisa|RH|Recrutamento|Engenharia|Arquitetura|Generalista","pontosFortes":["item"],"pontosFracos":["item"],"problemas":["item"],"sugestoes":["item"],"benchmark":"texto","resumo":"texto"}',
    "Retorne ate 4 itens por lista.",
    "Cada item da lista deve ter no maximo 140 caracteres e ser util para o usuario ajustar o perfil no LinkedIn.",
    `Nome: ${profile.name || "Nao informado"}`,
    `Headline: ${profile.headline || "Nao informado"}`,
    `Experiencias: ${profile.experiences.join(" | ") || "Nao informado"}`,
    `Score local: ${baseAnalysis.score}`,
    `Nivel local: ${baseAnalysis.nivel}`,
    `Foco local: ${baseAnalysis.foco}`,
    `Pontos fortes locais: ${baseAnalysis.pontosFortes.join(" | ") || "Nenhum"}`,
    `Pontos fracos locais: ${baseAnalysis.pontosFracos.join(" | ") || "Nenhum"}`,
    `Problemas locais: ${baseAnalysis.problemas.join(" | ") || "Nenhum"}`,
    `Sugestoes locais: ${baseAnalysis.sugestoes.join(" | ") || "Nenhuma"}`,
    `Benchmark local: ${baseAnalysis.benchmark}`,
    `Resumo local: ${baseAnalysis.resumo}`,
    `Sinais: ${JSON.stringify(baseAnalysis.signals)}`,
  ].join("\n");
}

export function shouldRetryGroqWithoutJsonMode(error) {
  const code =
    error?.error?.error?.code || error?.error?.code || error?.code || "";
  const message =
    error?.error?.error?.message ||
    error?.error?.message ||
    error?.message ||
    "";

  return (
    code === "json_validate_failed" ||
    message.toLowerCase().includes("failed to validate json")
  );
}

export function buildGroqMessages(
  profile,
  baseAnalysis,
  relaxedJsonMode = false,
) {
  const prompt = buildGroqPrompt(profile, baseAnalysis);

  if (!relaxedJsonMode) {
    return [{ role: "user", content: prompt }];
  }

  return [
    {
      role: "system",
      content:
        "Voce responde somente com JSON puro, sem markdown, sem comentarios e sem texto fora do objeto.",
    },
    {
      role: "user",
      content: `${prompt}\nRetorne apenas um objeto JSON bruto, iniciando em { e terminando em } .`,
    },
  ];
}

export function parseGroqAnalysisText(text, baseAnalysis) {
  if (!text) {
    throw new Error("Groq returned an empty response");
  }

  const parsed = JSON.parse(extractJsonBlock(text));

  const allowedFocus = [
    "Frontend",
    "Backend",
    "Dados",
    "UX",
    "UI",
    "Cloud",
    "SRE",
    "DBA",
    "Cyber Segurança",
    "Produto",
    "Finanças",
    "Gastronomia",
    "Marketing",
    "Administração",
    "Saúde",
    "Enfermagem",
    "Medicina",
    "Educação",
    "Pesquisa",
    "RH",
    "Recrutamento",
    "Engenharia",
    "Arquitetura",
    "Generalista",
  ];
  const parsedFocus = sanitizeModelText(parsed.foco);
  const focusIsAllowed = allowedFocus.includes(parsedFocus);
  const shouldKeepLocalFocus =
    parsedFocus === "Generalista" && baseAnalysis.foco !== "Generalista";

  return {
    nivel: ["Junior", "Pleno", "Senior"].includes(parsed.nivel)
      ? parsed.nivel
      : baseAnalysis.nivel,
    foco:
      parsedFocus && focusIsAllowed && !shouldKeepLocalFocus
        ? parsedFocus
        : baseAnalysis.foco,
    pontosFortes: sanitizeList(parsed.pontosFortes, baseAnalysis.pontosFortes),
    pontosFracos: sanitizeList(parsed.pontosFracos, baseAnalysis.pontosFracos),
    problemas: sanitizeList(parsed.problemas, baseAnalysis.problemas),
    sugestoes: sanitizeList(parsed.sugestoes, baseAnalysis.sugestoes),
    benchmark: sanitizeModelText(parsed.benchmark)
      ? sanitizeModelText(parsed.benchmark)
      : baseAnalysis.benchmark,
    resumo: sanitizeModelText(parsed.resumo)
      ? sanitizeModelText(parsed.resumo)
      : baseAnalysis.resumo,
    provider: `groq:${DEFAULT_MODEL}`,
  };
}

export async function generateGroqAnalysis(profile, baseAnalysis) {
  const groq = createGroqClient();

  if (!groq) {
    return null;
  }

  try {
    const payload = await groq.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0.2,
      max_completion_tokens: 900,
      response_format: { type: "json_object" },
      messages: buildGroqMessages(profile, baseAnalysis),
    });

    return parseGroqAnalysisText(
      payload.choices?.[0]?.message?.content,
      baseAnalysis,
    );
  } catch (error) {
    if (!shouldRetryGroqWithoutJsonMode(error)) {
      throw error;
    }

    const payload = await groq.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0.2,
      max_completion_tokens: 900,
      messages: buildGroqMessages(profile, baseAnalysis, true),
    });

    return parseGroqAnalysisText(
      payload.choices?.[0]?.message?.content,
      baseAnalysis,
    );
  }
}

export function buildFallbackResponse(baseAnalysis) {
  return {
    nivel: baseAnalysis.nivel,
    score: baseAnalysis.score,
    foco: baseAnalysis.foco,
    pontosFortes: baseAnalysis.pontosFortes,
    pontosFracos: baseAnalysis.pontosFracos,
    problemas: baseAnalysis.problemas,
    benchmark: baseAnalysis.benchmark,
    resumo: baseAnalysis.resumo,
    sugestoes: baseAnalysis.sugestoes,
    provider: "local-fallback",
  };
}

export async function analyzeLinkedInProfile(data) {
  const profile = normalizeProfile(data);
  const baseAnalysis = buildRuleBasedAnalysis(profile);

  try {
    const aiAnalysis = await generateGroqAnalysis(profile, baseAnalysis);

    if (aiAnalysis) {
      return {
        nivel: aiAnalysis.nivel,
        score: baseAnalysis.score,
        foco: aiAnalysis.foco,
        pontosFortes: aiAnalysis.pontosFortes,
        pontosFracos: aiAnalysis.pontosFracos,
        problemas: aiAnalysis.problemas,
        benchmark: aiAnalysis.benchmark,
        resumo: aiAnalysis.resumo,
        sugestoes: aiAnalysis.sugestoes,
        provider: aiAnalysis.provider,
      };
    }
  } catch (error) {
    console.warn(
      "[LinkedIn Analyzer API] Groq unavailable, using fallback analysis",
      error,
    );
  }

  return buildFallbackResponse(baseAnalysis);
}
