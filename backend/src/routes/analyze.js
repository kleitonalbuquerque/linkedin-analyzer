import express from "express";
import { analyzeLinkedInProfile } from "../services/aiService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const data = req.body;

  const result = await analyzeLinkedInProfile(data);

  res.json(result);
});

export default router;
