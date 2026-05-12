import express from "express";
import { analyzeLinkedInProfile } from "../services/aiService.js";

const router = express.Router();
const MAX_TEXT_LENGTH = 600;
const MAX_EXPERIENCES = 50;

function normalizeString(value) {
  return typeof value === "string"
    ? value.normalize("NFC").trim().slice(0, MAX_TEXT_LENGTH)
    : "";
}

function validateAnalyzePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      isValid: false,
      error: "Payload inválido. Envie um objeto com os dados do perfil.",
    };
  }

  const name = normalizeString(payload.name);
  const headline = normalizeString(payload.headline);
  const experiences = Array.isArray(payload.experiences)
    ? payload.experiences
        .map((experience) => normalizeString(experience))
        .filter(Boolean)
        .slice(0, MAX_EXPERIENCES)
    : [];

  if (!headline && experiences.length === 0) {
    return {
      isValid: false,
      error: "Forneça ao menos um headline ou uma experiência do perfil.",
    };
  }

  return {
    isValid: true,
    data: {
      name,
      headline,
      experiences,
    },
  };
}

export { normalizeString, validateAnalyzePayload };

router.post("/", async (req, res) => {
  try {
    const validation = validateAnalyzePayload(req.body);

    if (!validation.isValid) {
      res.status(400).json({
        message: validation.error,
      });
      return;
    }

    const data = validation.data;

    console.info("[LinkedIn Analyzer API] Analyze request received", data);

    const result = await analyzeLinkedInProfile(data);

    console.info("[LinkedIn Analyzer API] Analyze response", result);

    res.json(result);
  } catch (error) {
    console.error("[LinkedIn Analyzer API] Analyze request failed", error);
    res.status(500).json({
      message: "Falha ao processar a análise do perfil.",
    });
  }
});

export default router;
