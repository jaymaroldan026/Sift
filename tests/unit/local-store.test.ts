import { describe, expect, it } from "vitest";
import { defaultExtractionConfig } from "../../shared/filters";
import { createMemoryStorageDriver, createLocalSiftStore } from "../../shared/local-store";
import type { ExtractionRow } from "../../shared/types";

describe("local Sift store", () => {
  it("saves sessions and presets without a server", async () => {
    const store = createLocalSiftStore(createMemoryStorageDriver());
    const rows: ExtractionRow[] = [
      {
        id: "row_1",
        rawValue: "@chloerose",
        cleanedValue: "chloerose",
        username: "chloerose",
        type: "username",
        status: "valid",
        sourceDomain: "example.com",
        extractedAt: "2026-08-03T00:00:00.000Z"
      }
    ];

    const session = await store.createSession({
      name: "Example scan",
      domain: "example.com",
      mode: "username",
      sourceType: "visible-page",
      rows
    });
    const preset = await store.savePreset({
      name: "Letters Only Usernames",
      isDefault: true,
      config: defaultExtractionConfig
    });

    expect((await store.listSessions())[0]).toMatchObject({ id: session.id, summary: { validResults: 1 } });
    expect((await store.listPresets())[0]).toMatchObject({ id: preset.id, name: "Letters Only Usernames" });
  });
});
