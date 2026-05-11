import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve(import.meta.dirname, "..", "dist");
const removableFiles = [
  "manifest.dev.json",
  "manifest.store.json",
];

if (!existsSync(distDir)) {
  console.error(`Store dist not found: ${distDir}`);
  process.exit(1);
}

for (const fileName of removableFiles) {
  const filePath = resolve(distDir, fileName);

  if (existsSync(filePath)) {
    rmSync(filePath);
    console.log(`Removed store-extraneous file: ${fileName}`);
  }
}

console.log("Store dist prepared for submission.");
