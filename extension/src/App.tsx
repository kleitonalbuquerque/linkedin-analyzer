import { useState } from "react";

type AnalysisResult = {
  score: number;
  suggestions: string[];
};

type LinkedInProfile = {
  name?: string;
  headline?: string;
  experiences?: unknown[];
};

async function getProfileFromActiveTab(tabId: number) {
  try {
    return (await chrome.tabs.sendMessage(tabId, {
      type: "GET_PROFILE",
    })) as LinkedInProfile;
  } catch (error) {
    console.warn("[LinkedIn Analyzer] Content script not ready, injecting it", error);

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content/script.js"],
    });

    return (await chrome.tabs.sendMessage(tabId, {
      type: "GET_PROFILE",
    })) as LinkedInProfile;
  }
}

function App() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    try {
      setError(null);
      console.info("[LinkedIn Analyzer] Starting profile analysis");

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) {
        console.warn("[LinkedIn Analyzer] No active tab found");
        setError("Nenhuma aba ativa encontrada.");
        return;
      }

      if (!tab.url?.includes("linkedin.com/in/")) {
        console.warn("[LinkedIn Analyzer] Active tab is not a LinkedIn profile", tab.url);
        setError("Abra um perfil do LinkedIn antes de analisar.");
        return;
      }

      const profile = await getProfileFromActiveTab(tab.id);

      if (!profile.headline && (!profile.experiences || profile.experiences.length === 0)) {
        console.warn("[LinkedIn Analyzer] Profile data was empty", profile);
        setError("Nao foi possivel capturar os dados do perfil exibido.");
        return;
      }

      console.info("[LinkedIn Analyzer] Profile captured", profile);

      const res = await fetch("http://localhost:3000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}`);
      }

      const data = (await res.json()) as AnalysisResult;
      console.info("[LinkedIn Analyzer] Analysis finished", data);
      setAnalysis(data);
    } catch (caughtError) {
      console.error("[LinkedIn Analyzer] Analysis failed", caughtError);

      const message = caughtError instanceof Error
        ? caughtError.message
        : "Erro desconhecido ao analisar o perfil.";

      setError(`Falha ao analisar o perfil: ${message}`);
    }
  };

  return (
    <div style={{ padding: 10, width: 300 }}>
      <h2>LinkedIn Analyzer</h2>

      <button onClick={analyze}>Analisar Perfil</button>

      {error && <p>{error}</p>}

      {analysis && (
        <div>
          <h3>Score: {analysis.score}</h3>
          <ul>
            {analysis.suggestions.map((s: string) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;