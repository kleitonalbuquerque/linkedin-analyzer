import express from "express";
import { analyzeLinkedInProfile } from "../services/aiService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const data = req.body;

  console.info("[LinkedIn Analyzer API] Analyze request received", data);

  const result = await analyzeLinkedInProfile(data);

  console.info("[LinkedIn Analyzer API] Analyze response", result);

  res.json(result);
});

export default router;
