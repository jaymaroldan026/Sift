import { extractFromText } from "../shared/extractor";
import { createLocalSiftStore } from "../shared/local-store";
import type { ExtractionMode, ExtractionResult } from "../shared/types";

const store = createLocalSiftStore();

const state = {
  mode: "username" as ExtractionMode,
  domain: "unknown",
  lastResult: undefined as ExtractionResult | undefined
};

const els = {
  domain: document.querySelector<HTMLParagraphElement>("#domain")!,
  connection: document.querySelector<HTMLSpanElement>("#connection")!,
  connectionDot: document.querySelector<HTMLSpanElement>("#connection-dot")!,
  notice: document.querySelector<HTMLParagraphElement>("#notice")!,
  lastCount: document.querySelector<HTMLElement>("#last-count")!,
  progress: document.querySelector<HTMLProgressElement>("#progress")!,
  minLength: document.querySelector<HTMLInputElement>("#min-length")!,
  maxLength: document.querySelector<HTMLInputElement>("#max-length")!,
  removeInvalid: document.querySelector<HTMLInputElement>("#remove-invalid")!
};

document.querySelectorAll<HTMLButtonElement>(".mode").forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode as ExtractionMode;
    document.querySelectorAll(".mode").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});

document.querySelector("#extract-names")?.addEventListener("click", () => runExtraction("name"));
document.querySelector("#extract-usernames")?.addEventListener("click", () => runExtraction("username"));
document.querySelector("#extract-both")?.addEventListener("click", () => runExtraction("both"));
document.querySelector("#scan-current-page")?.addEventListener("click", () => runExtraction(state.mode));
document.querySelector("#open-dashboard")?.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/index.html") });
});
document.querySelector("#select-elements")?.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return showNotice("No active tab found.", true);
  await chrome.runtime.sendMessage({ type: "SIFT_START_SELECTOR", tabId: tab.id });
  window.close();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "SIFT_SELECTOR_CHOSEN") {
    showNotice(`Selector found: ${message.selector}`);
  }
});

init().catch((error) => showNotice(error instanceof Error ? error.message : "Popup initialization failed.", true));

async function init() {
  await Promise.all([checkHealth(), setActiveDomain()]);
}

async function checkHealth() {
  const health = await store.getHealth();
  els.connection.textContent = `Local dashboard ready v${health.version}`;
  els.connectionDot.classList.add("ok");
}

async function setActiveDomain() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.url) return;
  const url = new URL(tab.url);
  state.domain = url.hostname;
  els.domain.textContent = url.hostname;
}

async function runExtraction(mode: ExtractionMode) {
  els.progress.value = 20;
  const page = await requestPageSnapshot();
  if (!page.text) {
    showNotice("No rendered text found on this page.", true);
    els.progress.value = 0;
    return;
  }

  const result = extractFromText(page.text, {
    mode,
    sourceType: "visible-page",
    sourceDomain: page.domain || state.domain,
    config: {
      usernameOptions: {
        minLength: numberValue(els.minLength, 8),
        maxLength: numberValue(els.maxLength, 12),
        invalidCharacterHandling: els.removeInvalid.checked ? "remove" : "exclude"
      }
    }
  });

  state.lastResult = result;
  els.lastCount.textContent = String(result.summary.validResults);
  els.progress.value = 70;
  await saveResult(mode, result, page.domain || state.domain);
  els.progress.value = 100;
  showNotice(`Scanned ${result.summary.totalScanned}. ${result.summary.validResults} valid, ${result.summary.rejectedResults} rejected.`);
  setTimeout(() => (els.progress.value = 0), 800);
}

async function requestPageSnapshot(): Promise<{ text: string; domain: string }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) throw new Error("No active tab found.");
  try {
    return await chrome.tabs.sendMessage(tab.id, { type: "SIFT_SCAN_PAGE" });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content-script.js"] });
    return await chrome.tabs.sendMessage(tab.id, { type: "SIFT_SCAN_PAGE" });
  }
}

async function saveResult(mode: ExtractionMode, result: ExtractionResult, domain: string) {
  try {
    await store.createSession({ name: `${domain} ${mode} scan`, domain, mode, sourceType: "visible-page", rows: result.rows });
  } catch {
    showNotice("Preview created, but local browser storage is unavailable.", true);
  }
}

function numberValue(input: HTMLInputElement, fallback: number): number {
  const value = Number.parseInt(input.value, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function showNotice(message: string, error = false) {
  els.notice.textContent = message;
  els.notice.style.color = error ? "#d63b32" : "#6b6b6b";
}
