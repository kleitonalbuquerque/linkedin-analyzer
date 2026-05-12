import { useState } from "react";

import "./App.css";
import {
  analyzeActiveProfile,
  exportAnalysisPdf,
  formatAnalysisProvider,
  reportClientError,
  type AnalysisResult,
  type LinkedInProfile,
} from "./lib/analyzer";

function isExpectedUserError(message: string) {
  return /Atualize a aba|Abra um perfil|Abra a seção Todas as experiências|Não foi possível capturar|Nao foi possivel capturar|metadados da página|metadados da pagina|visualização do LinkedIn|visualizacao do LinkedIn|Payload inválido|Payload invalido/i.test(message);
}

function App() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyze = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);
      setNotice(null);
      setAnalysis(null);
      const result = await analyzeActiveProfile();

      setProfile(result.profile);
      setNotice(result.notice || null);
      setAnalysis(result.analysis);
    } catch (caughtError) {
      const message = caughtError instanceof Error
        ? caughtError.message
        : "Erro desconhecido ao analisar o perfil.";

      const expected = isExpectedUserError(message);

      console.error("[LinkedIn Analyzer] Analysis failed", { expected, message, caughtError });
      void reportClientError({
        context: "analyze-profile",
        message,
        expected,
        stack: caughtError instanceof Error ? caughtError.stack : undefined,
      });

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
          <h1>Diagnóstico de perfil com score de mercado</h1>
          <p className="hero-copy">
            Capture o perfil aberto no LinkedIn, gere sugestões com IA e exporte um PDF do resultado.
          </p>
          <p className="disclosure-copy">
            Ao clicar em Analisar perfil, a extensão envia apenas nome, headline e experiências visíveis do
            perfil aberto para o backend do LinkedIn Analyzer processar o diagnóstico.
          </p>
          <p className="privacy-copy">
            Sem essa ação, nenhum dado do perfil é enviado. Consulte a política de privacidade pública do
            projeto para mais detalhes.
          </p>
          <p className="guidance-copy">
            Para incluir todas as experiências, abra a seção Todas as experiências no LinkedIn e mantenha essa
            aba ativa antes de analisar.
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
        {notice && <p className="status-message warning">{notice}</p>}

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
                <p className="muted-label">Experiências analisadas</p>
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
              <p className="muted-label">Sugestões prioritárias</p>
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
