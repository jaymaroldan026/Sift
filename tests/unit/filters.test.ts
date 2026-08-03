import { describe, expect, it } from "vitest";
import {
  cleanName,
  cleanUsername,
  countCharacters,
  dedupeRows
} from "../../shared/filters";

describe("Sift cleaning defaults", () => {
  it("removes zero-width characters from names while preserving emoji, accents, and punctuation", () => {
    expect(cleanName("✨ Chloé Rose \u200B-Jr. 🌹").cleaned).toBe("✨ Chloé Rose -Jr. 🌹");
  });

  it("accepts short alphanumeric usernames with digits by default", () => {
    expect(cleanUsername("@debo1").cleaned).toBe("debo1");
    expect(cleanUsername("Lil08").cleaned).toBe("Lil08");
    expect(cleanUsername("@chloe.rose").rejectionReason).toBe("Contains symbol");
  });

  it("can remove invalid username characters when configured", () => {
    const result = cleanUsername("@chloe.rose", {
      invalidCharacterHandling: "remove",
      minLength: 8,
      maxLength: 12
    });

    expect(result.status).toBe("valid");
    expect(result.cleaned).toBe("chloerose");
  });

  it("counts unicode characters by code point", () => {
    expect(countCharacters("Chloé")).toBe(5);
  });

  it("marks case-insensitive duplicates with a clear reason", () => {
    const rows = dedupeRows([
      {
        id: "1",
        rawValue: "@ChloeRose",
        cleanedValue: "chloerose",
        type: "username",
        status: "valid",
        sourceDomain: "example.com",
        extractedAt: "2026-08-03T00:00:00.000Z"
      },
      {
        id: "2",
        rawValue: "@chloerose",
        cleanedValue: "chloerose",
        type: "username",
        status: "valid",
        sourceDomain: "example.com",
        extractedAt: "2026-08-03T00:00:00.000Z"
      }
    ]);

    expect(rows[1].status).toBe("duplicate");
    expect(rows[1].rejectionReason).toBe("Duplicate value");
  });
});
