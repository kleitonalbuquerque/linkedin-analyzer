import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { analyzeActiveProfile, exportAnalysisPdf, reportClientError } = vi.hoisted(() => ({
  analyzeActiveProfile: vi.fn(),
  exportAnalysisPdf: vi.fn(),
  reportClientError: vi.fn(),
}));

vi.mock("./lib/analyzer", () => ({
  analyzeActiveProfile,
  exportAnalysisPdf,
  reportClientError,
}));

import App from "./App";

describe("App", () => {
  beforeEach(() => {
    analyzeActiveProfile.mockReset();
    exportAnalysisPdf.mockReset();
    reportClientError.mockReset();
  });

  it("renders the analysis result and exports the PDF", async () => {
    analyzeActiveProfile.mockResolvedValue({
      profile: {
        name: "Kleiton",
        headline: "Backend Engineer",
        experiences: ["Criei APIs em Node.js"],
      },
      analysis: {
        nivel: "Pleno",
        score: 82,
        foco: "Backend",
        pontosFortes: ["Boa densidade de palavras-chave"],
        pontosFracos: ["Falta de metricas de impacto"],
        problemas: ["Sem metricas claras de impacto nas experiencias."],
        benchmark: "Bom posicionamento para o mercado.",
        resumo: "Resumo objetivo.",
        sugestoes: ["Inclua resultados com numeros."],
        provider: "local-fallback",
      },
    });

    render(<App />);

    expect(
      screen.getByText(/a extensão envia apenas nome, headline e experiências visíveis/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/sem essa ação, nenhum dado do perfil é enviado/i)).toBeInTheDocument();
    expect(screen.getByText(/para incluir todas as experiências/i)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Analisar perfil" }));

    expect(await screen.findByText("82")).toBeInTheDocument();
    expect(screen.getByText("Bom posicionamento para o mercado.")).toBeInTheDocument();
    expect(screen.getByText("Boa densidade de palavras-chave")).toBeInTheDocument();
    expect(screen.getByText("Criei APIs em Node.js")).toBeInTheDocument();
    expect(screen.queryByText("Análise local")).not.toBeInTheDocument();

    const exportButton = screen.getByRole("button", { name: "Exportar PDF" });
    expect(exportButton).toBeEnabled();

    await user.click(exportButton);

    expect(exportAnalysisPdf).toHaveBeenCalledWith(
      expect.objectContaining({ score: 82 }),
      expect.objectContaining({ name: "Kleiton" }),
    );
  });

  it("shows a non-blocking capture notice with the analysis result", async () => {
    analyzeActiveProfile.mockResolvedValue({
      profile: {
        name: "Kleiton",
        headline: "Backend Engineer",
        experiences: ["Projeto 1", "Projeto 2"],
      },
      analysis: {
        nivel: "Pleno",
        score: 82,
        foco: "Backend",
        pontosFortes: ["Boa densidade de palavras-chave"],
        pontosFracos: ["Falta de metricas de impacto"],
        problemas: ["Sem metricas claras de impacto nas experiencias."],
        benchmark: "Bom posicionamento para o mercado.",
        resumo: "Resumo objetivo.",
        sugestoes: ["Inclua resultados com numeros."],
        provider: "local-fallback",
      },
      notice: "Para capturar todas as experiências, abra a seção Todas as experiências do LinkedIn.",
    });

    render(<App />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Analisar perfil" }));

    expect(
      await screen.findByText("Para capturar todas as experiências, abra a seção Todas as experiências do LinkedIn."),
    ).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("shows the loading state while analyzing", async () => {
    let resolveAnalysis: ((value: unknown) => void) | undefined;

    analyzeActiveProfile.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAnalysis = resolve;
        }),
    );

    render(<App />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Analisar perfil" }));

    expect(screen.getByRole("button", { name: "Analisando..." })).toBeDisabled();

    resolveAnalysis?.({
      profile: { name: "Kleiton", headline: "Backend Engineer", experiences: ["Projeto"] },
      analysis: {
        nivel: "Pleno",
        score: 82,
        foco: "Backend",
        pontosFortes: ["Boa densidade de palavras-chave"],
        pontosFracos: ["Falta de metricas de impacto"],
        problemas: ["Sem metricas claras de impacto nas experiencias."],
        benchmark: "Bom posicionamento para o mercado.",
        resumo: "Resumo objetivo.",
        sugestoes: ["Inclua resultados com numeros."],
        provider: "local-fallback",
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Analisar perfil" })).toBeEnabled();
    });
  });

  it("shows user-friendly errors for failed analysis attempts", async () => {
    analyzeActiveProfile.mockRejectedValueOnce(new Error("Payload inválido"));

    render(<App />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Analisar perfil" }));

    expect(await screen.findByText("Falha ao analisar o perfil: Payload inválido")).toBeInTheDocument();
    expect(reportClientError).toHaveBeenCalledWith({
      context: "analyze-profile",
      message: "Payload inválido",
      expected: true,
      stack: expect.any(String),
    });
  });

  it("falls back to the unknown error message for non-Error failures", async () => {
    analyzeActiveProfile.mockRejectedValueOnce("boom");

    render(<App />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Analisar perfil" }));

    expect(
      await screen.findByText("Falha ao analisar o perfil: Erro desconhecido ao analisar o perfil."),
    ).toBeInTheDocument();
    expect(reportClientError).toHaveBeenCalledWith({
      context: "analyze-profile",
      message: "Erro desconhecido ao analisar o perfil.",
      expected: false,
      stack: undefined,
    });
  });
});
