import { useState } from "react";

import "./App.css";
import {
  analyzeActiveProfile,
  exportAnalysisPdf,
  formatAnalysisProvider,
  type AnalysisResult,
  type LinkedInProfile,
} from "./lib/analyzer";

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
      const result = await analyzeActiveProfile();

      setProfile(result.profile);
      setAnalysis(result.analysis);
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
    exportAnalysisPdf(analysis, profile);
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
                <span className="provider-pill">{formatAnalysisProvider(analysis.provider)}</span>
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

            {profile?.experiences?.length ? (
              <div>
                <p className="muted-label">Experiencias analisadas</p>
                <ul className="bullet-list profile-list">
                  {profile.experiences.map((experience, index) => (
                    <li key={`${experience}-${index}`}>{experience}</li>
                  ))}
                </ul>
              </div>
            ) : null}

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