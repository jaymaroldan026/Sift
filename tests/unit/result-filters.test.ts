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

  it("drops values outside the configured length range", () => {
    expect(applyValueFilters("debo1", { minLength: 5, maxLength: 8 })).toBe("debo1");
    expect(applyValueFilters("dolli", { minLength: 6, maxLength: 8 })).toBe("");
    expect(applyValueFilters("toolongusername", { minLength: 1, maxLength: 8 })).toBe("");
  });

  it("converts usernames to lowercase when enabled", () => {
    expect(applyValueFilters("Lil08", { lowercase: true })).toBe("lil08");
  });

  it("drops emoji-only display names when enabled", () => {
    expect(applyValueFilters("🌹❤️🔥", { removeEmojiOnly: true })).toBe("");
    expect(applyValueFilters("Debster ❤️", { removeEmojiOnly: true })).toBe("Debster ❤️");
  });

  it("removes decorative emoji symbols from display names", () => {
    expect(applyValueFilters("lic ♡", { removeEmoji: true })).toBe("lic");
    expect(applyValueFilters("✦ alicia ✧", { removeEmoji: true })).toBe("alicia");
    expect(applyValueFilters("° ✧ alicia ✧", { removeEmoji: true })).toBe("alicia");
  });
});
