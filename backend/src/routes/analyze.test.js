import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { analyzeLinkedInProfile } = vi.hoisted(() => ({
  analyzeLinkedInProfile: vi.fn(),
}));

vi.mock("../services/aiService.js", () => ({
  analyzeLinkedInProfile,
}));

import { createApp } from "../server.js";
import { normalizeString, validateAnalyzePayload } from "./analyze.js";

describe("analyze route helpers", () => {
  it("normalizes strings by trimming and limiting length", () => {
    const value = `  ${"x".repeat(700)}  `;

    expect(normalizeString(value)).toHaveLength(600);
    expect(normalizeString(42)).toBe("");
    expect(normalizeString("  Na\u0303o  ")).toBe("Não");
  });

  it("rejects invalid payloads", () => {
    expect(validateAnalyzePayload(null)).toEqual({
      isValid: false,
      error: "Payload inválido. Envie um objeto com os dados do perfil.",
    });

    expect(validateAnalyzePayload([])).toEqual({
      isValid: false,
      error: "Payload inválido. Envie um objeto com os dados do perfil.",
    });
  });

  it("requires headline or experience", () => {
    expect(validateAnalyzePayload({ name: "Teste" })).toEqual({
      isValid: false,
      error: "Forneça ao menos um headline ou uma experiência do perfil.",
    });
  });

  it("sanitizes valid payload data", () => {
    const result = validateAnalyzePayload({
      name: "  Kleiton  ",
      headline: "  Desenvolvedor Backend Na\u0303o  ",
      experiences: [
        "  API em Node.js e integraça\u0303o  ",
        "",
        null,
        "x".repeat(800),
      ],
    });

    expect(result).toEqual({
      isValid: true,
      data: {
        name: "Kleiton",
        headline: "Desenvolvedor Backend Não",
        experiences: ["API em Node.js e integração", "x".repeat(600)],
      },
    });
  });

  it("keeps more than ten sanitized experiences with a defensive cap", () => {
    const experiences = Array.from(
      { length: 55 },
      (_, index) => `Experiência ${index + 1} com impacto em produtos digitais.`,
    );

    const result = validateAnalyzePayload({
      headline: "Software Developer",
      experiences,
    });

    expect(result.isValid).toBe(true);
    expect(result.data.experiences).toHaveLength(50);
    expect(result.data.experiences[49]).toBe("Experiência 50 com impacto em produtos digitais.");
  });
});

describe("analyze route", () => {
  const app = createApp();

  beforeEach(() => {
    analyzeLinkedInProfile.mockReset();
  });

  it("returns 400 when payload is invalid", async () => {
    const response = await request(app).post("/analyze").send({ name: "A" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Forneça ao menos um headline ou uma experiência do perfil.",
    });
    expect(analyzeLinkedInProfile).not.toHaveBeenCalled();
  });

  it("returns analysis when payload is valid", async () => {
    analyzeLinkedInProfile.mockResolvedValue({
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
    });

    const response = await request(app)
      .post("/analyze")
      .send({
        name: "  Kleiton  ",
        headline: "  Desenvolvedor Backend  ",
        experiences: ["  API em Node.js  "],
      });

    expect(response.status).toBe(200);
    expect(analyzeLinkedInProfile).toHaveBeenCalledWith({
      name: "Kleiton",
      headline: "Desenvolvedor Backend",
      experiences: ["API em Node.js"],
    });
    expect(response.body.score).toBe(82);
  });

  it("returns 500 when service fails", async () => {
    analyzeLinkedInProfile.mockRejectedValue(new Error("boom"));

    const response = await request(app)
      .post("/analyze")
      .send({
        headline: "Desenvolvedor Backend",
        experiences: ["API em Node.js"],
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Falha ao processar a análise do perfil.",
    });
  });
});
