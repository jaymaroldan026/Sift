import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import type { ExtractionSession, Preset } from "../../../shared/types";

export type SiftDatabase = ReturnType<typeof createDatabase>;

export function createDatabase(filePath = "server/database/sift.sqlite") {
  mkdirSync(dirname(filePath), { recursive: true });
  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS extraction_sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      mode TEXT NOT NULL,
      source_type TEXT NOT NULL,
      rows_json TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      preset_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      config_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return {
    raw: db,
    close: () => db.close(),
    listSessions(): ExtractionSession[] {
      return db.prepare("SELECT * FROM extraction_sessions ORDER BY created_at DESC").all().map((row) => readSession(asRow(row)));
    },
    getSession(id: string): ExtractionSession | undefined {
      const row = db.prepare("SELECT * FROM extraction_sessions WHERE id = ?").get(id);
      return row ? readSession(asRow(row)) : undefined;
    },
    saveSession(session: ExtractionSession): ExtractionSession {
      db.prepare(`
        INSERT INTO extraction_sessions
          (id, name, domain, mode, source_type, rows_json, summary_json, preset_id, created_at, updated_at)
        VALUES
          (@id, @name, @domain, @mode, @sourceType, @rowsJson, @summaryJson, @presetId, @createdAt, @updatedAt)
      `).run({
        id: session.id,
        name: session.name,
        domain: session.domain,
        mode: session.mode,
        sourceType: session.sourceType,
        rowsJson: JSON.stringify(session.rows),
        summaryJson: JSON.stringify(session.summary),
        presetId: session.presetId ?? null,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      });
      return session;
    },
    deleteSession(id: string): boolean {
      return db.prepare("DELETE FROM extraction_sessions WHERE id = ?").run(id).changes > 0;
    },
    listPresets(): Preset[] {
      return db.prepare("SELECT * FROM presets ORDER BY is_default DESC, name ASC").all().map((row) => readPreset(asRow(row)));
    },
    getPreset(id: string): Preset | undefined {
      const row = db.prepare("SELECT * FROM presets WHERE id = ?").get(id);
      return row ? readPreset(asRow(row)) : undefined;
    },
    savePreset(preset: Preset): Preset {
      if (preset.isDefault) db.prepare("UPDATE presets SET is_default = 0").run();
      db.prepare(`
        INSERT INTO presets
          (id, name, description, is_default, config_json, created_at, updated_at)
        VALUES
          (@id, @name, @description, @isDefault, @configJson, @createdAt, @updatedAt)
      `).run({
        id: preset.id,
        name: preset.name,
        description: preset.description ?? null,
        isDefault: preset.isDefault ? 1 : 0,
        configJson: JSON.stringify(preset.config),
        createdAt: preset.createdAt,
        updatedAt: preset.updatedAt
      });
      return preset;
    },
    updatePreset(id: string, preset: Omit<Preset, "id" | "createdAt">): Preset | undefined {
      const existing = this.getPreset(id);
      if (!existing) return undefined;
      if (preset.isDefault) db.prepare("UPDATE presets SET is_default = 0 WHERE id != ?").run(id);
      const updated: Preset = { ...preset, id, createdAt: existing.createdAt };
      db.prepare(`
        UPDATE presets
        SET name = @name, description = @description, is_default = @isDefault, config_json = @configJson, updated_at = @updatedAt
        WHERE id = @id
      `).run({
        id,
        name: updated.name,
        description: updated.description ?? null,
        isDefault: updated.isDefault ? 1 : 0,
        configJson: JSON.stringify(updated.config),
        updatedAt: updated.updatedAt
      });
      return updated;
    },
    deletePreset(id: string): boolean {
      return db.prepare("DELETE FROM presets WHERE id = ?").run(id).changes > 0;
    }
  };
}

function readSession(row: Record<string, unknown>): ExtractionSession {
  return {
    id: String(row.id),
    name: String(row.name),
    domain: String(row.domain),
    mode: row.mode as ExtractionSession["mode"],
    sourceType: row.source_type as ExtractionSession["sourceType"],
    rows: JSON.parse(String(row.rows_json)),
    summary: JSON.parse(String(row.summary_json)),
    presetId: row.preset_id ? String(row.preset_id) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function readPreset(row: Record<string, unknown>): Preset {
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description ? String(row.description) : undefined,
    isDefault: Boolean(row.is_default),
    config: JSON.parse(String(row.config_json)),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function asRow(row: unknown): Record<string, unknown> {
  return row as Record<string, unknown>;
}
