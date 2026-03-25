import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("./services/aiService.js", () => ({
  analyzeLinkedInProfile: vi.fn(async () => ({
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
  })),
}));

import app, { getAllowedOrigins, startServer } from "./server.js";

describe("server", () => {
  it("reads allowed origins from environment when provided", () => {
    vi.stubEnv(
      "ALLOWED_ORIGINS",
      "https://app.example, https://admin.example ",
    );

    expect(getAllowedOrigins()).toEqual([
      "https://app.example",
      "https://admin.example",
    ]);

    vi.unstubAllEnvs();
  });

  it("returns health status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "linkedin-analyzer-backend",
    });
  });

  it("allows chrome extension origins", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "chrome-extension://abc123");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "chrome-extension://abc123",
    );
  });

  it("rejects disallowed origins", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "https://malicious.example");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Erro interno do servidor.",
    });
  });

  it("allows configured default origins", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
  });

  it("returns 404 for unknown routes", async () => {
    const response = await request(app).get("/missing-route");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Rota nao encontrada.",
    });
  });

  it("starts server with the provided port", () => {
    const listen = vi.fn((_port, callback) => {
      callback();
      return { close: vi.fn() };
    });
    const fakeApp = { listen };
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    startServer(fakeApp, 4321);

    expect(listen).toHaveBeenCalledWith(4321, expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith("Server is running on port 4321");

    logSpy.mockRestore();
  });
});
