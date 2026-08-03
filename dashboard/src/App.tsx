import { useEffect, useMemo, useState } from "react";
import { createExportFilename } from "../../shared/exporters";
import { extractFromText } from "../../shared/extractor";
import { createConfig, defaultExtractionConfig } from "../../shared/filters";
import type { ExtractionMode, ExtractionRow, ExtractionSession } from "../../shared/types";
import { createSession, exportRows, getHealth, listSessions } from "./lib/api";

const sampleText = "debo1\ndolli\nLil08\nDebs9\ndebbie ♡\n❤️Debster 💜";

export function App() {
  const [version, setVersion] = useState("0.1.1");
  const [domain, setDomain] = useState("manual.local");
  const [mode, setMode] = useState<Exclude<ExtractionMode, "both">>("username");
  const [sourceText, setSourceText] = useState(sampleText);
  const [query, setQuery] = useState("");
  const [sessions, setSessions] = useState<ExtractionSession[]>([]);
  const [notice, setNotice] = useState("");

  const config = useMemo(
    () =>
      createConfig({
        ...defaultExtractionConfig,
        mode,
        sourceType: "manual",
        sourceDomain: domain,
        usernameOptions: { minLength: 1, maxLength: 15 }
      }),
    [domain, mode]
  );

  const result = useMemo(
    () => extractFromText(sourceText, { mode, sourceType: "manual", sourceDomain: domain, config }),
    [config, domain, mode, sourceText]
  );

  const visibleRows = useMemo(() => {
    return result.rows
      .filter((row) => row.status === "valid")
      .filter((row) => row.cleanedValue.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  }, [query, result.rows]);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const [health, history] = await Promise.all([getHealth(), listSessions()]);
    setVersion(health.version);
    setSessions(history);
  }

  async function extract(nextMode: Exclude<ExtractionMode, "both">) {
    setMode(nextMode);
    const nextResult = extractFromText(sourceText, {
      mode: nextMode,
      sourceType: "manual",
      sourceDomain: domain,
      config: { ...config, mode: nextMode }
    });
    const session = await createSession({
      name: `${domain} ${nextMode === "username" ? "usernames" : "names"}`,
      domain,
      mode: nextMode,
      sourceType: "manual",
      rows: nextResult.rows
    });
    setSessions((current) => [session, ...current]);
    setNotice(`Found ${session.summary.validResults} ${nextMode === "username" ? "usernames" : "names"}.`);
  }

  async function copyValues(rows: ExtractionRow[] = visibleRows) {
    await navigator.clipboard.writeText(rows.map((row) => row.cleanedValue).join("\n"));
    setNotice(`Copied ${rows.length} ${mode === "username" ? "usernames" : "names"}.`);
  }

  async function download(format: "txt" | "csv" | "json") {
    const text = await exportRows(visibleRows, format);
    const blob = new Blob([text], { type: format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = createExportFilename(mode, domain, format);
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <h1>Sift</h1>
            <p>Extract usernames or names from visible text.</p>
          </div>
        </div>
        <div className="status-pill">
          <span />
          Local v{version}
        </div>
      </header>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Current source</p>
          <input aria-label="Source domain" value={domain} onChange={(event) => setDomain(event.target.value)} />
        </div>
        <div className="primary-actions" aria-label="Extraction actions">
          <button className={mode === "username" ? "primary active" : "primary"} type="button" onClick={() => extract("username")}>
            Get Usernames
          </button>
          <button className={mode === "name" ? "primary active" : "primary"} type="button" onClick={() => extract("name")}>
            Get Names
          </button>
        </div>
      </section>

      <section className="workspace-grid">
        <section className="panel input-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Input</p>
              <h2>Paste Text</h2>
            </div>
            <label className="file-button">
              Import
              <input
                type="file"
                accept=".txt,.csv,text/plain,text/csv"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (file) setSourceText(await file.text());
                }}
              />
            </label>
          </div>
          <textarea aria-label="Text to extract from" value={sourceText} onChange={(event) => setSourceText(event.target.value)} />
        </section>

        <section className="panel results-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Results</p>
              <h2>{mode === "username" ? "Usernames" : "Names"}</h2>
            </div>
            <div className="actions">
              <button type="button" onClick={() => copyValues()}>Copy</button>
              <button type="button" onClick={() => download("txt")}>TXT</button>
              <button type="button" onClick={() => download("csv")}>CSV</button>
            </div>
          </div>

          <div className="result-meta">
            <strong>{visibleRows.length}</strong>
            <span>{mode === "username" ? "usernames" : "names"} ready</span>
          </div>

          <input className="search" placeholder={`Search ${mode === "username" ? "usernames" : "names"}`} value={query} onChange={(event) => setQuery(event.target.value)} />

          <div className="result-list">
            {visibleRows.map((row) => (
              <button className="result-item" key={row.id} type="button" onClick={() => copyValues([row])}>
                <span>{row.cleanedValue}</span>
                <small>{row.sourceDomain}</small>
              </button>
            ))}
            {!visibleRows.length && <p className="empty">No {mode === "username" ? "usernames" : "names"} found yet.</p>}
          </div>
        </section>
      </section>

      <section className="history-strip" aria-label="Recent extractions">
        <div>
          <p className="eyebrow">Recent</p>
          <strong>{sessions.length ? `${sessions.length} saved extractions` : "No saved extractions yet"}</strong>
        </div>
        <button type="button" onClick={refresh}>Refresh</button>
      </section>

      <p className="notice" role="status">{notice}</p>
    </main>
  );
}
