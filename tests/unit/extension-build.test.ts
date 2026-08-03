import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("extension build validation", () => {
  it("rejects the TypeScript source folder as a load-unpacked target", () => {
    expect(() =>
      execFileSync("node", ["scripts/validate-extension.mjs", "extension"], {
        encoding: "utf8",
        stdio: "pipe"
      })
    ).toThrow(/Load the built extension from dist\/extension/);
  });
});
