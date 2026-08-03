import { useEffect, useMemo, useState } from "react";
import { createExportFilename } from "../../shared/exporters";
import { extractFromText, previewRows } from "../../shared/extractor";
import { createConfig, defaultExtractionConfig } from "../../shared/filters";
import type { ExtractionMode, ExtractionRow, ExtractionSession, Preset } from "../../shared/types";
import { createSession, exportRows, getHealth, listPresets, listSessions, savePreset } from "./lib/api";

const sampleText = "Chloe Rose 🌹\n@chloerose\nchloe123\n✨ Olivia Honey ✨\n@oliviahoney";

export function App() {
  const [connected, setConnected] = useState(false);
  const [version, setVersion] = useState("0.1.0");
  const [domain, setDomain] = useState("manual.local");
  const [mode, setMode] = useState<ExtractionMode>("username");
  const [sourceText, setSourceText] = useState(sampleText);
  const [minLength, setMinLength] = useState(8);
  const [maxLength, setMaxLength] = useState(12);
  const [invalidHandling, setInvalidHandling] = useState<"exclude" | "remove">("exclude");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sessions, setSessions] = useState<ExtractionSession[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  const config = useMemo(
    () =>
      createConfig({
        ...defaultExtractionConfig,
        mode,
        sourceType: "manual",
        sourceDomain: domain,
        usernameOptions: { minLength, maxLength, invalidCharacterHandling: invalidHandling }
      }),
    [domain, invalidHandling, maxLength, minLength, mode]
  );

  const preview = useMemo(
    () => previewRows(extractFromText(sourceText, { mode, sourceType: "manual", sourceDomain: domain, config }), 25),
    [config, domain, mode, sourceText]
  );

  const filteredRows = useMemo(() => {
    return preview.rows.filter((row) => {
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const haystack = `${row.name ?? ""} ${row.username ?? ""} ${row.rawValue} ${row.cleanedValue}`.toLocaleLowerCase();
      return matchesStatus && haystack.includes(query.toLocaleLowerCase());
    });
  }, [preview.rows, query, statusFilter]);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    try {
      const [health, history, savedPresets] = await Promise.all([getHealth(), listSessions(), listPresets()]);
      setConnected(true);
      setVersion(health.version);
      setSessions(history);
      setPresets(savedPresets);
    } catch {
      setConnected(false);
      setNotice("Local browser storage is unavailable.");
    }
  }

  async function runExtraction() {
    try {
      const session = await createSession({
        name: `${domain} ${mode} extraction`,
        domain,
        mode,
        sourceType: "manual",
        rows: preview.rows
      });
      setSessions((current) => [session, ...current]);
      setNotice(`Saved ${session.summary.validResults} valid results from ${domain}.`);
    } catch {
      setNotice("Could not save extraction to local browser storage.");
    }
  }

  async function createPreset() {
    try {
      const preset = await savePreset({
        name: `${mode === "username" ? "Letters Only Usernames" : "Sift"} ${minLength}-${maxLength}`,
        description: "Saved from dashboard configuration",
        isDefault: presets.length === 0,
        config
      });
      setPresets((current) => [preset, ...current]);
      setNotice(`Preset saved: ${preset.name}`);
    } catch {
      setNotice("Could not save preset.");
    }
  }

  async function copyRows(rows: ExtractionRow[]) {
    const text = rows.map((row) => row.cleanedValue).join("\n");
    await navigator.clipboard.writeText(text);
    setNotice(`Copied ${rows.length} rows.`);
  }

  async function download(format: "txt" | "csv" | "json") {
    const rows = selectedIds.length ? preview.rows.filter((row) => selectedIds.includes(row.id)) : preview.rows;
    const text = await exportRows(rows, format);
    const blob = new Blob([text], { type: format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = createExportFilename(mode, domain, format);
    link.click();
    URL.revokeObjectURL(url);
  }

  function toggleSelected(row: ExtractionRow) {
    setSelectedIds((current) => (current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id]));
  }

  const summaryCards = [
    ["Total scanned", preview.summary.totalScanned],
    ["Valid results", preview.summary.validResults],
    ["Unique results", preview.summary.uniqueResults],
    ["Duplicates", preview.summary.duplicates],
    ["Rejected", preview.summary.rejectedResults],
    ["Names", preview.summary.namesExtracted],
    ["Usernames", preview.summary.usernamesExtracted]
  ];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <h1>Sift</h1>
            <p>Local extraction dashboard</p>
          </div>
        </div>
        <div className="status-pill" data-online={connected}>
          <span />
          {connected ? `Local v${version}` : "Storage offline"}
        </div>
        <div className="domain-pill">{domain}</div>
      </header>

      <section className="summary-grid" aria-label="Extraction summary">
        {summaryCards.map(([label, value]) => (
          <article className="summary-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="workspace-grid">
        <aside className="panel config-panel">
          <div className="panel-heading">
            <h2>Configuration</h2>
            <button type="button" onClick={createPreset}>Save Preset</button>
          </div>

          <label>
            Source domain
            <input value={domain} onChange={(event) => setDomain(event.target.value)} />
          </label>

          <label>
            Extraction mode
            <select value={mode} onChange={(event) => setMode(event.target.value as ExtractionMode)}>
              <option value="name">Extract Names</option>
              <option value="username">Extract Usernames</option>
              <option value="both">Extract Both</option>
            </select>
          </label>

          <div className="range-row">
            <label>
              Minimum characters
              <input type="number" min={1} value={minLength} onChange={(event) => setMinLength(Number(event.target.value))} />
            </label>
            <label>
              Maximum characters
              <input type="number" min={minLength} value={maxLength} onChange={(event) => setMaxLength(Number(event.target.value))} />
            </label>
          </div>

          <label>
            Invalid character handling
            <select value={invalidHandling} onChange={(event) => setInvalidHandling(event.target.value as "exclude" | "remove")}>
              <option value="exclude">Exclude Entire Value</option>
              <option value="remove">Remove Invalid Characters</option>
            </select>
          </label>

          <details open>
            <summary>Manual text and file input</summary>
            <textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} rows={9} />
            <input
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) setSourceText(await file.text());
              }}
            />
          </details>

          <details>
            <summary>Advanced filters</summary>
            <div className="rule-list">
              <span>Remove emoji from names</span>
              <span>Letters-only usernames</span>
              <span>Case-insensitive duplicate removal</span>
              <span>Regex filters validate before extraction</span>
            </div>
          </details>

          <details>
            <summary>Scroll and pagination</summary>
            <div className="rule-list">
              <span>Current loaded content only by default</span>
              <span>Auto-scroll requires explicit extension-side enablement</span>
              <span>Maximum item safety limit: 10,000</span>
            </div>
          </details>
        </aside>

        <section className="panel results-panel">
          <div className="panel-heading">
            <h2>Preview Results</h2>
            <div className="actions">
              <button type="button" onClick={runExtraction}>Run Extraction</button>
              <button type="button" onClick={() => copyRows(selectedIds.length ? filteredRows.filter((row) => selectedIds.includes(row.id)) : filteredRows)}>
                Copy
              </button>
              <button type="button" onClick={() => download("csv")}>CSV</button>
              <button type="button" onClick={() => download("json")}>JSON</button>
            </div>
          </div>

          <div className="table-tools">
            <input placeholder="Search results" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All rows</option>
              <option value="valid">Valid only</option>
              <option value="rejected">Rejected only</option>
              <option value="duplicate">Duplicates only</option>
            </select>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th><input aria-label="Select all" type="checkbox" onChange={(event) => setSelectedIds(event.target.checked ? filteredRows.map((row) => row.id) : [])} /></th>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Raw value</th>
                  <th>Cleaned value</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Rejection reason</th>
                  <th>Source</th>
                  <th>Extracted</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td><input aria-label={`Select ${row.cleanedValue}`} checked={selectedIds.includes(row.id)} type="checkbox" onChange={() => toggleSelected(row)} /></td>
                    <td>{row.name}</td>
                    <td>{row.username}</td>
                    <td>{row.rawValue}</td>
                    <td>{row.cleanedValue}</td>
                    <td>{row.type}</td>
                    <td><span className={`status-badge ${row.status}`}>{row.status}</span></td>
                    <td>{row.rejectionReason}</td>
                    <td>{row.sourceDomain}</td>
                    <td>{new Date(row.extractedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section className="lower-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Extraction History</h2>
            <button type="button" onClick={refresh}>Refresh</button>
          </div>
          <div className="stack-list">
            {sessions.map((session) => (
              <article key={session.id}>
                <strong>{session.name}</strong>
                <span>{session.domain} · {session.mode} · {session.summary.validResults} accepted · {new Date(session.createdAt).toLocaleString()}</span>
              </article>
            ))}
            {!sessions.length && <p>No saved sessions yet.</p>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Presets</h2>
          </div>
          <div className="stack-list">
            {presets.map((preset) => (
              <article key={preset.id}>
                <strong>{preset.name}</strong>
                <span>{preset.description || "Local preset"} {preset.isDefault ? "· default" : ""}</span>
              </article>
            ))}
            {!presets.length && <p>No presets saved yet.</p>}
          </div>
        </section>
      </section>

      <p className="notice" role="status">{notice}</p>
    </main>
  );
}
