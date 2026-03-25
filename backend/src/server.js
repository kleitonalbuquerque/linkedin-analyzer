import "dotenv/config";
import express from "express";
import cors from "cors";
import analyzeRoute from "./routes/analyze.js";

const PORT = process.env.PORT || 3000;
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://www.linkedin.com",
];

export function getAllowedOrigins() {
  const envOrigins = process.env.ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return envOrigins?.length ? envOrigins : DEFAULT_ALLOWED_ORIGINS;
}

const allowedOrigins = getAllowedOrigins();

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origin.startsWith("chrome-extension://")) {
          callback(null, true);
          return;
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin not allowed by CORS"));
      },
    }),
  );
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "linkedin-analyzer-backend",
    });
  });

  app.use("/analyze", analyzeRoute);

  app.use((_req, res) => {
    res.status(404).json({
      message: "Rota nao encontrada.",
    });
  });

  app.use((error, _req, res, _next) => {
    console.error("[LinkedIn Analyzer API] Unhandled error", error);
    res.status(500).json({
      message: "Erro interno do servidor.",
    });
  });

  return app;
}

const app = createApp();

export function startServer(appInstance = app, port = PORT) {
  return appInstance.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;
