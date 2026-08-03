import { exportRowsAsCsv, exportRowsAsTxt } from "./exporters";
import { createConfig, summarizeRows } from "./filters";
import type { ExtractionMode, ExtractionRow, ExtractionSession, Preset, SourceType } from "./types";

const SESSIONS_KEY = "sift:sessions";
const PRESETS_KEY = "sift:presets";
const VERSION = "0.1.14";

export interface StorageDriver {
  get<T>(key: string, fallback: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
}

interface ChromeStorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export interface CreateSessionPayload {
  name?: string;
  domain: string;
  mode: ExtractionMode;
  sourceType: SourceType;
  rows: ExtractionRow[];
  presetId?: string;
}

export type SavePresetPayload = Pick<Preset, "name" | "description" | "isDefault" | "config">;

export function createLocalSiftStore(driver = createDefaultStorageDriver()) {
  return {
    async getHealth() {
      return { status: "ok", version: VERSION, storage: "browser-session" };
    },
    async listSessions(): Promise<ExtractionSession[]> {
      return driver.get(SESSIONS_KEY, []);
    },
    async createSession(payload: CreateSessionPayload): Promise<ExtractionSession> {
      const now = new Date().toISOString();
      const session: ExtractionSession = {
        id: createId("session"),
        name: payload.name ?? `${payload.domain} ${payload.mode} extraction`,
        domain: payload.domain,
        mode: payload.mode,
        sourceType: payload.sourceType,
        rows: payload.rows,
        summary: summarizeRows(payload.rows),
        presetId: payload.presetId,
        createdAt: now,
        updatedAt: now
      };
      const sessions = await this.listSessions();
      await driver.set(
        SESSIONS_KEY,
        [session, ...sessions.filter((item) => item.mode !== payload.mode)].slice(0, 2)
      );
      return session;
    },
    async clearSessions(): Promise<void> {
      await driver.set(SESSIONS_KEY, []);
    },
    async deleteSession(id: string): Promise<void> {
      const sessions = await this.listSessions();
      await driver.set(
        SESSIONS_KEY,
        sessions.filter((session) => session.id !== id)
      );
    },
    async listPresets(): Promise<Preset[]> {
      return driver.get(PRESETS_KEY, []);
    },
    async savePreset(payload: SavePresetPayload): Promise<Preset> {
      const now = new Date().toISOString();
      const preset: Preset = {
        id: createId("preset"),
        name: payload.name,
        description: payload.description,
        isDefault: payload.isDefault,
        config: createConfig(payload.config),
        createdAt: now,
        updatedAt: now
      };
      const presets = await this.listPresets();
      const nextPresets = preset.isDefault
        ? [preset, ...presets.map((item) => ({ ...item, isDefault: false }))]
        : [preset, ...presets];
      await driver.set(PRESETS_KEY, nextPresets);
      return preset;
    },
    async deletePreset(id: string): Promise<void> {
      const presets = await this.listPresets();
      await driver.set(
        PRESETS_KEY,
        presets.filter((preset) => preset.id !== id)
      );
    },
    async exportRows(rows: ExtractionRow[], format: "txt" | "csv" | "json"): Promise<string> {
      if (format === "json") return JSON.stringify(rows, null, 2);
      if (format === "txt") return exportRowsAsTxt(rows);
      return exportRowsAsCsv(rows);
    }
  };
}

export function createMemoryStorageDriver(seed: Record<string, unknown> = {}): StorageDriver {
  const memory = new Map<string, unknown>(Object.entries(seed));
  return {
    async get<T>(key: string, fallback: T): Promise<T> {
      return (memory.has(key) ? memory.get(key) : fallback) as T;
    },
    async set<T>(key: string, value: T): Promise<void> {
      memory.set(key, value);
    }
  };
}

export function createDefaultStorageDriver(): StorageDriver {
  const chromeSessionStorage = getChromeStorage("session");
  if (chromeSessionStorage) return createChromeStorageDriver(chromeSessionStorage);
  return createSessionStorageDriver();
}

function createChromeStorageDriver(storage: ChromeStorageArea): StorageDriver {
  return {
    async get<T>(key: string, fallback: T): Promise<T> {
      const result = await storage.get(key);
      return (result[key] ?? fallback) as T;
    },
    async set<T>(key: string, value: T): Promise<void> {
      await storage.set({ [key]: value });
    }
  };
}

function createSessionStorageDriver(): StorageDriver {
  return {
    async get<T>(key: string, fallback: T): Promise<T> {
      const value = globalThis.sessionStorage?.getItem(key);
      return value ? (JSON.parse(value) as T) : fallback;
    },
    async set<T>(key: string, value: T): Promise<void> {
      globalThis.sessionStorage?.setItem(key, JSON.stringify(value));
    }
  };
}

function getChromeStorage(area: "session" | "local"): ChromeStorageArea | undefined {
  return (globalThis as { chrome?: { storage?: { local?: ChromeStorageArea; session?: ChromeStorageArea } } }).chrome?.storage?.[area];
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
