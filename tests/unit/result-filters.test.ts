import { describe, expect, it } from "vitest";
import { applyValueFilters } from "../../shared/result-filters";

describe("result cleanup filters", () => {
  it("removes numbers, emoji, and symbols when enabled", () => {
    expect(
      applyValueFilters("❤️Debster9_💜", {
        removeNumbers: true,
        removeEmoji: true,
        removeSymbols: true,
        collapseSpaces: true
      })
    ).toBe("Debster");
  });

  it("keeps alphanumeric usernames when cleanup is disabled", () => {
    expect(applyValueFilters("Lil08", { removeNumbers: false, removeEmoji: false, removeSymbols: false, collapseSpaces: true })).toBe("Lil08");
  });
});
