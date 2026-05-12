import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../server.js";
import { sanitizeClientErrorPayload } from "./clientErrors.js";

describe("client error route helpers", () => {
  it("sanitizes and limits client error payload fields", () => {
    expect(
      sanitizeClientErrorPayload({
        source: "  extension-popup  ",
        context: "  analyze-profile  ",
        message: `  ${"x".repeat(700)}  `,
        expected: true,
        extensionVersion: "  1.0.2  ",
        userAgent: "Chrome",
        stack: "Erro com aça\u0303o",
      }),
    ).toEqual({
      source: "extension-popup",
      context: "analyze-profile",
      message: "x".repeat(500),
      expected: true,
      extensionVersion: "1.0.2",
      userAgent: "Chrome",
      stack: "Erro com ação",
    });
  });
});

describe("client error route", () => {
  const app = createApp();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs extension client errors without storing profile data", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await request(app)
      .post("/client-errors")
      .send({
        source: "extension-popup",
        context: "analyze-profile",
        message: "Falha no popup",
        expected: false,
        extensionVersion: "1.0.2",
      });

    expect(response.status).toBe(204);
    expect(errorSpy).toHaveBeenCalledWith(
      "[LinkedIn Analyzer API] Extension client error",
      {
        source: "extension-popup",
        context: "analyze-profile",
        message: "Falha no popup",
        expected: false,
        extensionVersion: "1.0.2",
      },
    );
  });

  it("logs expected client blocks as warnings", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await request(app)
      .post("/client-errors")
      .send({
        message: "Abra a seção Todas as experiências",
        expected: true,
      });

    expect(response.status).toBe(204);
    expect(warnSpy).toHaveBeenCalledWith(
      "[LinkedIn Analyzer API] Extension client error",
      {
        source: "extension",
        context: "",
        message: "Abra a seção Todas as experiências",
        expected: true,
      },
    );
  });
});
