import express from "express";

const router = express.Router();
const MAX_FIELD_LENGTH = 500;

function normalizeLogField(value, maxLength = MAX_FIELD_LENGTH) {
  return typeof value === "string"
    ? value.normalize("NFC").trim().slice(0, maxLength)
    : "";
}

export function sanitizeClientErrorPayload(payload = {}) {
  const message = normalizeLogField(payload.message);
  const context = normalizeLogField(payload.context, 120);
  const source = normalizeLogField(payload.source, 80) || "extension";
  const extensionVersion = normalizeLogField(payload.extensionVersion, 40);
  const userAgent = normalizeLogField(payload.userAgent, 240);
  const stack = normalizeLogField(payload.stack, 1000);

  return {
    source,
    context,
    message,
    expected: Boolean(payload.expected),
    ...(extensionVersion ? { extensionVersion } : {}),
    ...(userAgent ? { userAgent } : {}),
    ...(stack ? { stack } : {}),
  };
}

router.post("/", (req, res) => {
  const payload = sanitizeClientErrorPayload(req.body);
  const logger = payload.expected ? console.warn : console.error;

  logger("[LinkedIn Analyzer API] Extension client error", payload);

  res.status(204).send();
});

export default router;
