import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outDir = resolve(root, "dist/extension");

mkdirSync(outDir, { recursive: true });
cpSync(resolve(root, "extension/manifest.json"), resolve(outDir, "manifest.json"));

const stylesOut = resolve(outDir, "styles");
mkdirSync(stylesOut, { recursive: true });
cpSync(resolve(root, "extension/styles/popup.css"), resolve(stylesOut, "popup.css"));

const dashboardBuild = resolve(root, "dist/dashboard");
if (!existsSync(resolve(dashboardBuild, "index.html"))) {
  throw new Error("Dashboard build is missing. Run npm run build:dashboard before npm run build:extension.");
}
const dashboardOut = resolve(outDir, "dashboard");
rmSync(dashboardOut, { recursive: true, force: true });
cpSync(dashboardBuild, dashboardOut, { recursive: true });

if (!existsSync(resolve(outDir, "popup.html"))) {
  throw new Error("Extension popup.html was not generated.");
}
