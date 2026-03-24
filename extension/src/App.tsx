import { useState } from "react";
import { jsPDF } from "jspdf";

import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

type AnalysisResult = {
  nivel: string;
  score: number;
  foco: string;
  pontosFortes: string[];
  pontosFracos: string[];
  problemas: string[];
  benchmark: string;
  resumo: string;
  sugestoes: string[];
  provider: string;
};

type LinkedInProfile = {
  name?: string;
  headline?: string;
  experiences?: string[];
};

async function getProfileFromActiveTab(tabId: number) {
  try {
    const profile: LinkedInProfile = await chrome.tabs.sendMessage(tabId, {
      type: "GET_PROFILE",
    });

    return profile;
  } catch (error) {
    console.warn("[LinkedIn Analyzer] Content script not ready, injecting it", error);

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content/script.js"],
    });

    const profile: LinkedInProfile = await chrome.tabs.sendMessage(tabId, {
      type: "GET_PROFILE",
    });

    return profile;
  }
}

function buildPdfFileName(profile: LinkedInProfile | null) {
  return (profile?.name || "linkedin-profile")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "") || "linkedin-profile";
}

function App() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyze = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);
      setAnalysis(null);
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

      const activeProfile = await getProfileFromActiveTab(tab.id);

      if (!activeProfile.headline && (!activeProfile.experiences || activeProfile.experiences.length === 0)) {
        console.warn("[LinkedIn Analyzer] Profile data was empty", activeProfile);
        setError("Nao foi possivel capturar os dados do perfil exibido.");
        return;
      }

      setProfile(activeProfile);
      console.info("[LinkedIn Analyzer] Profile captured", activeProfile);

      const res = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(activeProfile),
      });

      if (!res.ok) {
        const errorPayload = await res.json().catch(() => null);
        const message = typeof errorPayload?.message === "string"
          ? errorPayload.message
          : `Backend returned ${res.status}`;

        throw new Error(message);
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
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportPdf = () => {
    if (!analysis) {
      return;
    }

    const document = new jsPDF({ unit: "pt", format: "a4" });
    const pageHeight = document.internal.pageSize.getHeight();
    const left = 40;
    const maxWidth = 515;
    let cursorY = 52;

    const ensureSpace = (requiredHeight: number) => {
      if (cursorY + requiredHeight > pageHeight - 40) {
        document.addPage();
        cursorY = 52;
      }
    };

    const writeBlock = (text: string, fontSize = 12, gapAfter = 16) => {
      document.setFontSize(fontSize);
      const lines = document.splitTextToSize(text, maxWidth);
      const height = lines.length * (fontSize + 2);
      ensureSpace(height + gapAfter);
      document.text(lines, left, cursorY);
      cursorY += height + gapAfter;
    };

    document.setFontSize(20);
    document.text("LinkedIn Analyzer Report", left, cursorY);
    cursorY += 28;

    writeBlock(`Perfil: ${profile?.name || "Nao informado"}`);
    writeBlock(`Headline: ${profile?.headline || "Nao informado"}`);
    writeBlock(`Nivel: ${analysis.nivel}`);
    writeBlock(`Score de mercado: ${analysis.score}/100`);
    writeBlock(`Foco principal: ${analysis.foco}`);
    writeBlock(`Benchmark: ${analysis.benchmark}`);
    writeBlock(`Resumo: ${analysis.resumo}`);

    document.setFontSize(14);
    ensureSpace(24);
    document.text("Pontos fortes", left, cursorY);
    cursorY += 20;

    analysis.pontosFortes.forEach((item, index) => {
      writeBlock(`${index + 1}. ${item}`, 12, 12);
    });

    document.setFontSize(14);
    ensureSpace(24);
    document.text("Pontos fracos", left, cursorY);
    cursorY += 20;

    analysis.pontosFracos.forEach((item, index) => {
      writeBlock(`${index + 1}. ${item}`, 12, 12);
    });

    document.setFontSize(14);
    ensureSpace(24);
    document.text("Problemas identificados", left, cursorY);
    cursorY += 20;

    analysis.problemas.forEach((item, index) => {
      writeBlock(`${index + 1}. ${item}`, 12, 12);
    });

    document.setFontSize(14);
    ensureSpace(24);
    document.text("Sugestoes prioritarias", left, cursorY);
    cursorY += 20;

    analysis.sugestoes.forEach((suggestion, index) => {
      writeBlock(`${index + 1}. ${suggestion}`, 12, 12);
    });

    document.save(`${buildPdfFileName(profile)}-analysis.pdf`);
  };

  return (
    <div className="popup-shell">
      <div className="popup-card">
        <div className="hero-block">
          <p className="eyebrow">LinkedIn Analyzer</p>
          <h1>Diagnostico de perfil com score de mercado</h1>
          <p className="hero-copy">
            Capture o perfil aberto no LinkedIn, gere sugestoes com IA e exporte um PDF do resultado.
          </p>
        </div>

        <div className="actions-row">
          <button className="primary-button" onClick={analyze} disabled={isAnalyzing}>
            {isAnalyzing ? "Analisando..." : "Analisar perfil"}
          </button>
          <button className="secondary-button" onClick={exportPdf} disabled={!analysis}>
            Exportar PDF
          </button>
        </div>

        {error && <p className="status-message error">{error}</p>}

        {analysis && (
          <div className="analysis-card">
            <div className="score-row">
              <div>
                <p className="muted-label">Score</p>
                <strong className="score-value">{analysis.score}</strong>
              </div>
              <div className="score-meta">
                <span className="pill">{analysis.nivel}</span>
                <span className="focus-pill">{analysis.foco}</span>
              </div>
            </div>

            <div className="details-grid">
              <div>
                <p className="muted-label">Benchmark</p>
                <p>{analysis.benchmark}</p>
              </div>
              <div>
                <p className="muted-label">Resumo</p>
                <p>{analysis.resumo}</p>
              </div>
            </div>

            <div className="details-grid two-columns">
              <div>
                <p className="muted-label">Pontos fortes</p>
                <ul className="bullet-list strengths-list">
                  {analysis.pontosFortes.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="muted-label">Pontos fracos</p>
                <ul className="bullet-list weaknesses-list">
                  {analysis.pontosFracos.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <p className="muted-label">Problemas identificados</p>
              <ul className="bullet-list problem-list">
                {analysis.problemas.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="muted-label">Sugestoes prioritarias</p>
              <ul className="bullet-list suggestions-list">
                {analysis.sugestoes.map((suggestion, index) => (
                  <li key={`${suggestion}-${index}`}>{suggestion}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;