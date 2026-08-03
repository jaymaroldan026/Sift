import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../../server/src/app";
import { createDatabase } from "../../server/src/database/db";
import type { ExtractionRow } from "../../shared/types";
import { defaultExtractionConfig } from "../../shared/filters";

describe("Sift local API", () => {
  let tempDir: string;
  let baseUrl: string;
  let closeServer: () => Promise<void>;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), "sift-api-"));
    const database = createDatabase(join(tempDir, "sift.sqlite"));
    const app = createApp(database);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing server address");
    baseUrl = `http://127.0.0.1:${address.port}`;
    closeServer = () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  afterEach(async () => {
    await closeServer();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("reports health", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
  });

  it("creates, lists, updates, and deletes presets", async () => {
    const createResponse = await fetch(`${baseUrl}/api/presets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Letters Only Usernames", config: defaultExtractionConfig })
    });
    const created = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(created.name).toBe("Letters Only Usernames");

    const listResponse = await fetch(`${baseUrl}/api/presets`);
    expect((await listResponse.json()).presets).toHaveLength(1);

    const updateResponse = await fetch(`${baseUrl}/api/presets/${created.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Eight to Twelve Characters", config: defaultExtractionConfig })
    });
    expect((await updateResponse.json()).name).toBe("Eight to Twelve Characters");

    const deleteResponse = await fetch(`${baseUrl}/api/presets/${created.id}`, { method: "DELETE" });
    expect(deleteResponse.status).toBe(204);
  });

  it("creates, lists, reads, deletes, and exports extraction sessions", async () => {
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

    const createResponse = await fetch(`${baseUrl}/api/extractions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Example scan",
        domain: "example.com",
        mode: "username",
        sourceType: "manual",
        rows
      })
    });
    const created = await createResponse.json();
    expect(createResponse.status).toBe(201);
    expect(created.summary.validResults).toBe(1);

    const list = await (await fetch(`${baseUrl}/api/extractions`)).json();
    expect(list.sessions).toHaveLength(1);

    const detail = await (await fetch(`${baseUrl}/api/extractions/${created.id}`)).json();
    expect(detail.rows[0].cleanedValue).toBe("chloerose");

    const csv = await fetch(`${baseUrl}/api/export`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rows, format: "csv" })
    });
    expect(await csv.text()).toContain("chloerose");

    const deleted = await fetch(`${baseUrl}/api/extractions/${created.id}`, { method: "DELETE" });
    expect(deleted.status).toBe(204);
  });
});
