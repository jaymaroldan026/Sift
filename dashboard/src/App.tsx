import { useEffect, useMemo, useState } from "react";
import { createExportFilename } from "../../shared/exporters";
import { applyValueFilters, defaultValueFilterOptions, type ValueFilterOptions } from "../../shared/result-filters";
import type { ExtractionMode, ExtractionRow, ExtractionSession } from "../../shared/types";
import { clearSessions, exportRows, getHealth, listSessions } from "./lib/api";

type VisibleMode = Exclude<ExtractionMode, "both">;

const emptyFilters = { ...defaultValueFilterOptions };
const usernameDefaultFilters = { ...defaultValueFilterOptions, minLength: 1, maxLength: 15 };
const sessionsStorageKey = "sift:sessions";

export function App() {
  const [version, setVersion] = useState("0.1.6");
  const [mode, setMode] = useState<VisibleMode>("username");
  const [sessions, setSessions] = useState<ExtractionSession[]>([]);
  const [usernameFilters, setUsernameFilters] = useState<ValueFilterOptions>(usernameDefaultFilters);
  const [nameFilters, setNameFilters] = useState<ValueFilterOptions>(emptyFilters);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const refreshOnFocus = () => {
      void refresh();
    };
    const refreshOnStorageChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === "session" && changes[sessionsStorageKey]) void refresh();
    };

    window.addEventListener("focus", refreshOnFocus);
    globalThis.chrome?.storage?.onChanged?.addListener(refreshOnStorageChange);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      globalThis.chrome?.storage?.onChanged?.removeListener(refreshOnStorageChange);
    };
  }, []);

  useEffect(() => {
    const clearOnClose = () => {
      void clearSessions();
    };
    window.addEventListener("pagehide", clearOnClose);
    return () => window.removeEventListener("pagehide", clearOnClose);
  }, []);

  const activeSession = useMemo(() => findLatestSession(sessions, mode), [mode, sessions]);
  const activeFilters = mode === "username" ? usernameFilters : nameFilters;

  const visibleRows = useMemo(() => {
    return (activeSession?.rows ?? [])
      .filter((row) => row.status === "valid" && row.type === mode)
      .map((row) => ({ ...row, cleanedValue: applyValueFilters(row.cleanedValue, activeFilters) }))
      .filter((row) => row.cleanedValue);
  }, [activeFilters, activeSession, mode]);

  const resultText = useMemo(() => visibleRows.map((row) => row.cleanedValue).join("\n"), [visibleRows]);

  async function refresh() {
    const [health, history] = await Promise.all([getHealth(), listSessions()]);
    setVersion(health.version);
    setSessions(history);
  }

  async function copyValues() {
    await navigator.clipboard.writeText(resultText);
    setNotice(`Copied ${visibleRows.length} ${modeLabel(mode).plural}.`);
  }

  async function download(format: "txt" | "csv" | "json") {
    const text = await exportRows(visibleRows, format);
    const blob = new Blob([text], { type: format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = createExportFilename(mode, activeSession?.domain ?? "snapboard", format);
    link.click();
    URL.revokeObjectURL(url);
  }

  async function clearResults() {
    await clearSessions();
    setSessions([]);
    setNotice("Cleared temporary results.");
  }

  function updateFilter(targetMode: VisibleMode, key: keyof ValueFilterOptions, value: boolean) {
    const setter = targetMode === "username" ? setUsernameFilters : setNameFilters;
    setter((current) => ({ ...current, [key]: value }));
  }

  function updateLengthFilter(key: "minLength" | "maxLength", value: number) {
    setUsernameFilters((current) => {
      const nextValue = Math.max(1, Math.min(30, value));
      const next = { ...current, [key]: nextValue };
      const minLength = next.minLength ?? 1;
      const maxLength = next.maxLength ?? 15;
      return minLength > maxLength
        ? { ...next, [key === "minLength" ? "maxLength" : "minLength"]: nextValue }
        : next;
    });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <h1>Sift</h1>
            <p>SnapBoard username and display-name extractor.</p>
          </div>
        </div>
        <div className="status-pill">
          <span />
          Local v{version}
        </div>
      </header>

      <section className="workspace-grid">
        <section className="panel results-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Results</p>
              <h2>{modeLabel(mode).title}</h2>
            </div>
            <div className="actions">
              <button className={mode === "username" ? "active" : ""} type="button" onClick={() => setMode("username")}>
                Usernames
              </button>
              <button className={mode === "name" ? "active" : ""} type="button" onClick={() => setMode("name")}>
                Display Names
              </button>
              <button type="button" onClick={copyValues}>Copy</button>
              <button type="button" onClick={() => download("txt")}>TXT</button>
              <button type="button" onClick={() => download("csv")}>CSV</button>
              <button type="button" onClick={clearResults}>Clear</button>
            </div>
          </div>

          <div className="result-meta">
            <strong>{visibleRows.length}</strong>
            <span>{activeSession ? `${modeLabel(mode).plural} ready` : "scan SnapBoard first"}</span>
          </div>

          <textarea
            aria-label={`${modeLabel(mode).title} results`}
            className="results-textarea"
            readOnly
            placeholder={`Click ${mode === "username" ? "Get Usernames" : "Get Display Names"} in the Sift popup on SnapBoard.`}
            value={resultText}
          />
        </section>

        <aside className="panel settings-panel">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>Cleanup Rules</h2>
          </div>

          <SettingsGroup mode={mode} filters={activeFilters} onChange={updateFilter} onLengthChange={updateLengthFilter} />
        </aside>
      </section>

      <p className="notice" role="status">{notice}</p>
    </main>
  );
}

function SettingsGroup({
  mode,
  filters,
  onChange,
  onLengthChange
}: {
  mode: VisibleMode;
  filters: ValueFilterOptions;
  onChange: (mode: VisibleMode, key: keyof ValueFilterOptions, value: boolean) => void;
  onLengthChange: (key: "minLength" | "maxLength", value: number) => void;
}) {
  return (
    <section className="settings-group">
      <h3>{modeLabel(mode).title}</h3>
      {mode === "username" ? (
        <div className="length-control">
          <span>Length</span>
          <label>
            <input
              aria-label="Minimum username length"
              min="1"
              max="30"
              type="number"
              value={filters.minLength ?? 1}
              onChange={(event) => onLengthChange("minLength", event.target.valueAsNumber || 1)}
            />
            Min
          </label>
          <label>
            <input
              aria-label="Maximum username length"
              min="1"
              max="30"
              type="number"
              value={filters.maxLength ?? 15}
              onChange={(event) => onLengthChange("maxLength", event.target.valueAsNumber || 1)}
            />
            Max
          </label>
        </div>
      ) : null}
      <label>
        <input type="checkbox" checked={filters.removeNumbers} onChange={(event) => onChange(mode, "removeNumbers", event.target.checked)} />
        Remove numbers
      </label>
      <label>
        <input type="checkbox" checked={filters.removeEmoji} onChange={(event) => onChange(mode, "removeEmoji", event.target.checked)} />
        Remove emoji
      </label>
      <label>
        <input type="checkbox" checked={filters.removeSymbols} onChange={(event) => onChange(mode, "removeSymbols", event.target.checked)} />
        Remove symbols
      </label>
      <label>
        <input type="checkbox" checked={filters.collapseSpaces} onChange={(event) => onChange(mode, "collapseSpaces", event.target.checked)} />
        Trim spaces
      </label>
    </section>
  );
}

function findLatestSession(sessions: ExtractionSession[], mode: VisibleMode): ExtractionSession | undefined {
  return sessions.find((session) => session.mode === mode);
}

function modeLabel(mode: VisibleMode) {
  return mode === "username"
    ? { title: "Usernames", plural: "usernames" }
    : { title: "Display Names", plural: "display names" };
}
