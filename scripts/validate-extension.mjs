import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const target = process.argv[2] ?? "dist/extension";
const extensionDir = resolve(process.cwd(), target);
const sourceDir = resolve(process.cwd(), "extension");
const builtDir = resolve(process.cwd(), "dist/extension");

if (extensionDir === sourceDir) {
  fail("Load the built extension from dist/extension, not the TypeScript source folder extension.");
}

if (extensionDir !== builtDir) {
  fail(`Unexpected extension folder: ${target}. Run npm run build:extension and load dist/extension.`);
}

const manifestPath = join(extensionDir, "manifest.json");
if (!existsSync(manifestPath)) fail(`Missing manifest.json in ${target}. Run npm run build:extension.`);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const requiredFiles = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  ...Object.values(manifest.action?.default_icon ?? {}),
  ...Object.values(manifest.icons ?? {}),
  "dashboard/index.html",
  ...(manifest.content_scripts ?? []).flatMap((script) => script.js ?? [])
].filter(Boolean);

for (const file of requiredFiles) {
  if (!existsSync(join(extensionDir, file))) {
    fail(`Missing ${file} referenced by manifest.json. Run npm run build:extension.`);
  }
}

const popupHtml = readFileSync(join(extensionDir, manifest.action.default_popup), "utf8");
if (/127\.0\.0\.1|localhost/u.test(popupHtml)) {
  fail("The extension popup must not depend on localhost. Open the bundled dashboard instead.");
}
const popupScripts = [...popupHtml.matchAll(/src="\/?([^"]+\.js)"/gu)].map((match) => match[1]);
for (const file of popupScripts) {
  if (!existsSync(join(extensionDir, file))) {
    fail(`Missing popup script ${file}. Run npm run build:extension.`);
  }
}

const dashboardHtml = readFileSync(join(extensionDir, "dashboard/index.html"), "utf8");
if (/127\.0\.0\.1|localhost/u.test(dashboardHtml)) {
  fail("The bundled dashboard must not depend on localhost.");
}

console.log(`Extension load target is valid: ${target}`);

function fail(message) {
  console.error(message);
  process.exit(1);
}
