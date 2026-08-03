import type { ExtractionMode, ExtractionRow, ExtractionSession, Preset, SourceType } from "../../../shared/types";

const API_BASE = "http://127.0.0.1:5174";

export async function getHealth(): Promise<{ status: string; version: string }> {
  return jsonFetch("/api/health");
}

export async function listSessions(): Promise<ExtractionSession[]> {
  const body = await jsonFetch<{ sessions: ExtractionSession[] }>("/api/extractions");
  return body.sessions;
}

export async function createSession(payload: {
  name?: string;
  domain: string;
  mode: ExtractionMode;
  sourceType: SourceType;
  rows: ExtractionRow[];
  presetId?: string;
}): Promise<ExtractionSession> {
  return jsonFetch("/api/extractions", { method: "POST", body: JSON.stringify(payload) });
}

export async function deleteSession(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/extractions/${id}`, { method: "DELETE" });
}

export async function listPresets(): Promise<Preset[]> {
  const body = await jsonFetch<{ presets: Preset[] }>("/api/presets");
  return body.presets;
}

export async function savePreset(payload: Pick<Preset, "name" | "description" | "isDefault" | "config">): Promise<Preset> {
  return jsonFetch("/api/presets", { method: "POST", body: JSON.stringify(payload) });
}

export async function exportRows(rows: ExtractionRow[], format: "txt" | "csv" | "json"): Promise<string> {
  const response = await fetch(`${API_BASE}/api/export`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rows, format })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.text();
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers }
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
