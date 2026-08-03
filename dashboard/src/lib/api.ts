import { createLocalSiftStore } from "../../../shared/local-store";
import type { ExtractionMode, ExtractionRow, ExtractionSession, Preset, SourceType } from "../../../shared/types";

const store = createLocalSiftStore();

export async function getHealth(): Promise<{ status: string; version: string }> {
  return store.getHealth();
}

export async function listSessions(): Promise<ExtractionSession[]> {
  return store.listSessions();
}

export async function createSession(payload: {
  name?: string;
  domain: string;
  mode: ExtractionMode;
  sourceType: SourceType;
  rows: ExtractionRow[];
  presetId?: string;
}): Promise<ExtractionSession> {
  return store.createSession(payload);
}

export async function deleteSession(id: string): Promise<void> {
  await store.deleteSession(id);
}

export async function clearSessions(): Promise<void> {
  await store.clearSessions();
}

export async function listPresets(): Promise<Preset[]> {
  return store.listPresets();
}

export async function savePreset(payload: Pick<Preset, "name" | "description" | "isDefault" | "config">): Promise<Preset> {
  return store.savePreset(payload);
}

export async function exportRows(rows: ExtractionRow[], format: "txt" | "csv" | "json"): Promise<string> {
  return store.exportRows(rows, format);
}
