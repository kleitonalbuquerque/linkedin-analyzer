import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, extname, relative } from "node:path";

const distDir = resolve(import.meta.dirname, "..", "dist");
const manifestPath = resolve(distDir, "manifest.json");
const requiredFiles = [
  "manifest.json",
  "index.html",
  "content/script.js",
];
const forbiddenFiles = [
  "manifest.dev.json",
  "manifest.store.json",
];
const forbiddenPatterns = [
  {
    description: "localhost reference in store bundle",
    pattern: /http:\/\/localhost(?::\d+)?/i,
  },
  {
    description: "remote script tag",
    pattern: /<script\b[^>]*\bsrc=["']https?:\/\//i,
  },
  {
    description: "dynamic script element creation",
    pattern: /createElement\(\s*["']script["']\s*\)/i,
  },
  {
    description: "unsafe eval usage",
    pattern: /\bunsafe-eval\b|\beval\s*\(|\bnew Function\s*\(/,
  },
  {
    description: "javascript data URL execution",
    pattern: /data:text\/javascript/i,
  },
  {
    description: "common remote code CDN reference",
    pattern: /https:\/\/(?:unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|www\.googletagmanager\.com)\//i,
  },
];
const textExtensions = new Set([".js", ".html", ".css", ".json"]);
const errors = [];

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      return walk(entryPath);
    }

    if (entry.isFile()) {
      return [entryPath];
    }

    return [];
  });
}

if (!existsSync(distDir)) {
  errors.push(`Missing dist directory: ${distDir}`);
}

for (const file of requiredFiles) {
  const filePath = resolve(distDir, file);

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    errors.push(`Missing required store artifact: ${file}`);
  }
}

for (const file of forbiddenFiles) {
  if (existsSync(resolve(distDir, file))) {
    errors.push(`Forbidden store artifact present: ${file}`);
  }
}

if (!existsSync(manifestPath)) {
  errors.push("Missing manifest.json for store audit.");
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const permissions = Array.isArray(manifest.permissions) ? manifest.permissions : [];
  const hostPermissions = Array.isArray(manifest.host_permissions) ? manifest.host_permissions : [];
  const csp = manifest.content_security_policy?.extension_pages;

  for (const permission of ["activeTab"]) {
    if (permissions.includes(permission)) {
      errors.push(`Store manifest should not request ${permission}.`);
    }
  }

  if (hostPermissions.some((value) => typeof value === "string" && value.includes("localhost"))) {
    errors.push("Store manifest should not include localhost host permissions.");
  }

  if (typeof csp !== "string" || !csp.includes("script-src 'self'") || !csp.includes("object-src 'self'")) {
    errors.push("Store manifest must declare an explicit MV3 content_security_policy for extension pages.");
  }
}

if (existsSync(distDir)) {
  const files = walk(distDir);

  for (const filePath of files) {
    const extension = extname(filePath);

    if (!textExtensions.has(extension)) {
      continue;
    }

    const content = readFileSync(filePath, "utf8");
    const relativePath = relative(distDir, filePath);

    for (const check of forbiddenPatterns) {
      if (check.pattern.test(content)) {
        errors.push(`${relativePath}: ${check.description}`);
      }
    }
  }
}

if (errors.length) {
  console.error("Chrome Web Store audit failed:");
  errors.forEach((error) => {
    console.error(`- ${error}`);
  });
  process.exit(1);
}

console.log("Chrome Web Store audit passed.");
