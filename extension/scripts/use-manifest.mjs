import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const variant = process.argv[2];
const manifestMap = {
  dev: "manifest.dev.json",
  store: "manifest.store.json",
};

if (!variant || !(variant in manifestMap)) {
  console.error("Usage: node scripts/use-manifest.mjs <dev|store>");
  process.exit(1);
}

const publicDir = resolve(import.meta.dirname, "..", "public");
const sourcePath = resolve(publicDir, manifestMap[variant]);
const targetPath = resolve(publicDir, "manifest.json");

if (!existsSync(sourcePath)) {
  console.error(`Manifest variant not found: ${sourcePath}`);
  process.exit(1);
}

copyFileSync(sourcePath, targetPath);
console.log(`Applied manifest variant: ${variant}`);
