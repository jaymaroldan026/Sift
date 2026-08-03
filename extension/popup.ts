import { scanActiveTabForData } from "../shared/browser-scan";
import { createLocalSiftStore } from "../shared/local-store";

const store = createLocalSiftStore();

const state = {
  domain: "unknown"
};

const els = {
  domain: document.querySelector<HTMLParagraphElement>("#domain")!,
  connection: document.querySelector<HTMLSpanElement>("#connection")!,
  connectionDot: document.querySelector<HTMLSpanElement>("#connection-dot")!,
  notice: document.querySelector<HTMLParagraphElement>("#notice")!,
  usernameCount: document.querySelector<HTMLElement>("#username-count")!,
  nameCount: document.querySelector<HTMLElement>("#name-count")!,
  progress: document.querySelector<HTMLProgressElement>("#progress")!
};

document.querySelector("#get-data")?.addEventListener("click", () => {
  void runDataScan();
});
document.querySelector("#open-dashboard")?.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/index.html") });
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

async function runDataScan() {
  els.progress.value = 20;
  try {
    const counts = await scanActiveTabForData();
    state.domain = counts.domain;
    els.domain.textContent = counts.domain;
    els.usernameCount.textContent = String(counts.usernames);
    els.nameCount.textContent = String(counts.names);
    els.progress.value = 100;
    showNotice(`Found ${counts.usernames} usernames and ${counts.names} display names.`);
    setTimeout(() => (els.progress.value = 0), 800);
  } catch (error) {
    els.progress.value = 0;
    showNotice(error instanceof Error ? error.message : "Could not scan this tab.", true);
  }
}

function showNotice(message: string, error = false) {
  els.notice.textContent = message;
  els.notice.style.color = error ? "#d63b32" : "#6b6b6b";
}
