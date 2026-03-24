export async function analyzeLinkedInProfile(data) {
  const { headline, experiences } = data;

  // MVP (sem IA ainda)
  let score = 50; // Pontuação base

  if (headline?.includes("React")) score += 10;
  if (experiences?.length > 3) score += 20;

  return {
    nivel: "Pleno",
    score,
    suggestions: [
      "Adicione mais detalhes sobre suas experiências anteriores.",
      "Inclua palavras-chave relevantes no seu headline.",
      "Inclua projetos ou conquistas específicas para destacar suas habilidades.",
    ],
  };
}
