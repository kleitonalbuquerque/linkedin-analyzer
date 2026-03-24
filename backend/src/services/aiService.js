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

function normalizeProfile(data = {}) {
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

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function countKeywordHits(text) {
  const lowerText = text.toLowerCase();

  return KEYWORDS.filter((keyword) => lowerText.includes(keyword)).length;
}

function countMatches(text, keywords) {
  const lowerText = text.toLowerCase();

  return keywords.filter((keyword) => lowerText.includes(keyword)).length;
}

function countMeasuredResults(experiences) {
  return experiences.filter((experience) =>
    /\d|%|kpi|roi|mrr|sql|usuarios|clientes/i.test(experience),
  ).length;
}

function scoreHeadline(headlineLength) {
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

function scoreKeywords(keywordHits) {
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

function scoreExperiences(experiencesCount) {
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

function scoreMeasuredResults(measuredResults) {
  if (measuredResults >= 3) {
    return 15;
  }

  if (measuredResults >= 1) {
    return 8;
  }

  return 0;
}

function determineNivel(score, experiencesCount, leadershipHits) {
  if (score >= 85 || leadershipHits >= 2) {
    return experiencesCount >= 4 ? "Senior" : "Pleno";
  }

  if (score >= 65) {
    return "Pleno";
  }

  return "Junior";
}

function determineFoco(combinedText) {
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

function pushIfMissing(list, item) {
  if (item && !list.includes(item)) {
    list.push(item);
  }
}

function buildProblemas({
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

function buildPontosFortes({
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

function buildPontosFracos({
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

function buildBenchmark(score) {
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

function buildRuleBasedAnalysis(profile) {
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

function extractJsonBlock(text) {
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

function sanitizeList(values, fallback) {
  const list = Array.isArray(values)
    ? values.map((value) => String(value).trim()).filter(Boolean)
    : [];

  return list.length > 0 ? list.slice(0, 4) : fallback;
}

function createGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new Groq({ apiKey });
}

function buildGroqPrompt(profile, baseAnalysis) {
  return [
    "Voce e um especialista em LinkedIn, recrutamento e posicionamento profissional.",
    "Analise o perfil abaixo em portugues do Brasil.",
    "Use o score e os sinais calculados localmente como referencia, mas responda em linguagem objetiva e acionavel.",
    "Responda SOMENTE em JSON valido.",
    "Formato esperado:",
    '{"nivel":"Junior|Pleno|Senior","foco":"Frontend|Backend|Dados|Produto|Generalista","pontosFortes":["item"],"pontosFracos":["item"],"problemas":["item"],"sugestoes":["item"],"benchmark":"texto","resumo":"texto"}',
    "Retorne ate 4 itens por lista.",
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

async function generateGroqAnalysis(profile, baseAnalysis) {
  const groq = createGroqClient();

  if (!groq) {
    return null;
  }

  const payload = await groq.chat.completions.create({
    model: DEFAULT_MODEL,
    temperature: 0.5,
    max_completion_tokens: 900,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: buildGroqPrompt(profile, baseAnalysis),
      },
    ],
  });

  const text = payload.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Groq returned an empty response");
  }

  const parsed = JSON.parse(extractJsonBlock(text));

  return {
    nivel: ["Junior", "Pleno", "Senior"].includes(parsed.nivel)
      ? parsed.nivel
      : baseAnalysis.nivel,
    foco:
      typeof parsed.foco === "string" && parsed.foco.trim()
        ? parsed.foco.trim()
        : baseAnalysis.foco,
    pontosFortes: sanitizeList(parsed.pontosFortes, baseAnalysis.pontosFortes),
    pontosFracos: sanitizeList(parsed.pontosFracos, baseAnalysis.pontosFracos),
    problemas: sanitizeList(parsed.problemas, baseAnalysis.problemas),
    sugestoes: sanitizeList(parsed.sugestoes, baseAnalysis.sugestoes),
    benchmark:
      typeof parsed.benchmark === "string" && parsed.benchmark.trim()
        ? parsed.benchmark.trim()
        : baseAnalysis.benchmark,
    resumo:
      typeof parsed.resumo === "string" && parsed.resumo.trim()
        ? parsed.resumo.trim()
        : baseAnalysis.resumo,
    provider: `groq:${DEFAULT_MODEL}`,
  };
}

function buildFallbackResponse(baseAnalysis) {
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
