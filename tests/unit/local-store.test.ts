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

  it("keeps only the current temporary scan per mode and can clear scans", async () => {
    const store = createLocalSiftStore(createMemoryStorageDriver());
    const createRow = (id: string, value: string, type: "username" | "name"): ExtractionRow => ({
      id,
      rawValue: value,
      cleanedValue: value,
      username: type === "username" ? value : undefined,
      name: type === "name" ? value : undefined,
      type,
      status: "valid",
      sourceDomain: "snapboard.onrender.com",
      extractedAt: "2026-08-03T00:00:00.000Z"
    });

    await store.createSession({
      domain: "snapboard.onrender.com",
      mode: "username",
      sourceType: "visible-page",
      rows: [createRow("row_1", "firstuser", "username")]
    });
    await store.createSession({
      domain: "snapboard.onrender.com",
      mode: "username",
      sourceType: "visible-page",
      rows: [createRow("row_2", "seconduser", "username")]
    });
    await store.createSession({
      domain: "snapboard.onrender.com",
      mode: "name",
      sourceType: "visible-page",
      rows: [createRow("row_3", "Second Name", "name")]
    });

    const sessions = await store.listSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions.find((session) => session.mode === "username")?.rows[0]?.cleanedValue).toBe("seconduser");
    expect(sessions.find((session) => session.mode === "name")?.rows[0]?.cleanedValue).toBe("Second Name");

    await store.clearSessions();
    expect(await store.listSessions()).toEqual([]);
  });
});
