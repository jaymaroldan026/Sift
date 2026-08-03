import { Router } from "express";
import { extractionSessionCreateSchema } from "../../../shared/validators";
import { summarizeRows } from "../../../shared/filters";
import type { ExtractionSession } from "../../../shared/types";
import type { SiftDatabase } from "../database/db";

export function createExtractionRouter(database: SiftDatabase) {
  const router = Router();

  router.get("/", (_request, response) => {
    response.json({ sessions: database.listSessions() });
  });

  router.post("/", (request, response) => {
    const parsed = extractionSessionCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid extraction session", details: parsed.error.flatten() });
      return;
    }
    const now = new Date().toISOString();
    const session: ExtractionSession = {
      id: createId("session"),
      name: parsed.data.name ?? `${parsed.data.domain} ${parsed.data.mode} extraction`,
      domain: parsed.data.domain,
      mode: parsed.data.mode,
      sourceType: parsed.data.sourceType,
      rows: parsed.data.rows,
      summary: summarizeRows(parsed.data.rows),
      presetId: parsed.data.presetId,
      createdAt: now,
      updatedAt: now
    };

    response.status(201).json(database.saveSession(session));
  });

  router.get("/:id", (request, response) => {
    const session = database.getSession(request.params.id);
    if (!session) {
      response.status(404).json({ error: "Extraction session not found" });
      return;
    }
    response.json(session);
  });

  router.delete("/:id", (request, response) => {
    if (!database.deleteSession(request.params.id)) {
      response.status(404).json({ error: "Extraction session not found" });
      return;
    }
    response.status(204).send();
  });

  return router;
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
