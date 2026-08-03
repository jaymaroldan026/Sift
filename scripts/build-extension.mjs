import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outDir = resolve(root, "dist/extension");

mkdirSync(outDir, { recursive: true });
cpSync(resolve(root, "extension/manifest.json"), resolve(outDir, "manifest.json"));

const stylesOut = resolve(outDir, "styles");
mkdirSync(stylesOut, { recursive: true });
cpSync(resolve(root, "extension/styles/popup.css"), resolve(stylesOut, "popup.css"));

if (!existsSync(resolve(outDir, "popup.html"))) {
  throw new Error("Extension popup.html was not generated.");
}
