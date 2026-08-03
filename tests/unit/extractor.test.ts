import { describe, expect, it } from "vitest";
import {
  extractFromCards,
  extractFromLinks,
  extractFromTable,
  extractFromText
} from "../../shared/extractor";

describe("Sift extraction", () => {
  it("extracts valid default names and usernames from sample text", () => {
    const result = extractFromText("Chloe Rose 🌹\n@chloerose\nchloe123\n✨ Olivia Honey ✨\n@oliviahoney", {
      mode: "both",
      sourceDomain: "example.com"
    });

    const valid = result.rows.filter((row) => row.status === "valid");
    expect(valid.map((row) => row.cleanedValue)).toContain("Chloe Rose 🌹");
    expect(valid.map((row) => row.cleanedValue)).toContain("chloerose");
    expect(result.rows.find((row) => row.rawValue === "chloe123")?.cleanedValue).toBe("chloe123");
  });

  it("preserves paired name and username relationships from repeated cards", () => {
    const result = extractFromCards(
      [
        { name: "Chloe Rose 🌹", username: "@chloerose" },
        { name: "Olivia Honey", username: "@oliviahoney" }
      ],
      { sourceDomain: "example.com" }
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ name: "Chloe Rose 🌹", username: "chloerose", status: "valid" });
  });

  it("extracts usernames from final URL path segments", () => {
    const result = extractFromLinks(["https://example.com/chloerose", "https://example.com/chloe.rose"], {
      sourceDomain: "example.com"
    });

    expect(result.rows[0].cleanedValue).toBe("chloerose");
    expect(result.rows[1].status).toBe("rejected");
  });

  it("extracts from html table-like data", () => {
    const result = extractFromTable(
      [
        ["Name", "Username"],
        ["Chloé Rose", "@chloerose"],
        ["Invalid", "@chloe123"]
      ],
      { sourceDomain: "example.com" }
    );

    expect(result.rows[0]).toMatchObject({ name: "Chloé Rose", username: "chloerose" });
    expect(result.rows[1]).toMatchObject({ name: "Invalid", username: "chloe123", status: "valid" });
  });
});
