import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import packageJson from "../package.json" with { type: "json" };

const root = resolve(import.meta.dirname, "..");
const releaseDir = resolve(root, "release");
const archive = resolve(releaseDir, `sift-extension-v${packageJson.version}.zip`);

mkdirSync(releaseDir, { recursive: true });
rmSync(archive, { force: true });

execFileSync("zip", ["-qr", archive, "."], {
  cwd: resolve(root, "dist/extension"),
  stdio: "inherit"
});

console.log(`Created ${archive}`);
