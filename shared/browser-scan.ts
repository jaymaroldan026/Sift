import { createLocalSiftStore } from "./local-store";
import type { ExtractionResult, ExtractionRow } from "./types";

type SnapBoardSnapshot = {
  text: string;
  domain: string;
  snapBoard?: {
    usernames: string[];
    names: string[];
  };
};

type BrowserTab = {
  id?: number;
  active?: boolean;
};

type BrowserApi = {
  tabs: {
    query(queryInfo: Record<string, unknown>): Promise<BrowserTab[]>;
    sendMessage<T>(tabId: number, message: Record<string, unknown>): Promise<T>;
  };
  scripting: {
    executeScript(details: { target: { tabId: number }; files: string[] }): Promise<unknown>;
  };
};

export interface BrowserScanCounts {
  domain: string;
  usernames: number;
  names: number;
}

const usernameSelector = ".username-value";
const nameSelector = ".display-value";

export async function scanActiveTabForData(): Promise<BrowserScanCounts> {
  const browser = getBrowserApi();
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) throw new Error("No active tab found.");
  return scanTabForData(tab.id);
}

export async function scanCurrentSnapBoardTab(): Promise<BrowserScanCounts> {
  const browser = getBrowserApi();
  const tabs = await browser.tabs.query({ url: ["https://snapboard.onrender.com/*", "http://snapboard.onrender.com/*"] });
  const activeSnapBoardTab = tabs.find((tab) => tab.active && tab.id) ?? tabs.find((tab) => tab.id);
  if (!activeSnapBoardTab?.id) throw new Error("No SnapBoard tab found.");
  return scanTabForData(activeSnapBoardTab.id);
}

async function scanTabForData(tabId: number): Promise<BrowserScanCounts> {
  const page = await requestPageSnapshot(tabId);
  const domain = page.domain || "snapboard.onrender.com";
  const usernames = page.snapBoard?.usernames ?? [];
  const names = page.snapBoard?.names ?? [];

  await saveResult("username", createResultFromValues(usernames, "username", domain, usernameSelector), domain);
  await saveResult("name", createResultFromValues(names, "name", domain, nameSelector), domain);

  return { domain, usernames: usernames.length, names: names.length };
}

async function requestPageSnapshot(tabId: number): Promise<SnapBoardSnapshot> {
  const browser = getBrowserApi();
  try {
    return await browser.tabs.sendMessage<SnapBoardSnapshot>(tabId, { type: "SIFT_SCAN_PAGE" });
  } catch {
    await browser.scripting.executeScript({ target: { tabId }, files: ["content-script.js"] });
    return await browser.tabs.sendMessage<SnapBoardSnapshot>(tabId, { type: "SIFT_SCAN_PAGE" });
  }
}

async function saveResult(mode: "username" | "name", result: ExtractionResult, domain: string) {
  const store = createLocalSiftStore();
  await store.createSession({ name: `${domain} ${mode} scan`, domain, mode, sourceType: "visible-page", rows: result.rows });
}

function createResultFromValues(
  values: string[],
  mode: "username" | "name",
  domain: string,
  selector: string
): ExtractionResult {
  const rows: ExtractionRow[] = values.map((value) => ({
    id: `row_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`,
    rawValue: value,
    cleanedValue: value,
    name: mode === "name" ? value : undefined,
    username: mode === "username" ? value : undefined,
    type: mode,
    status: "valid",
    sourceDomain: domain,
    sourceSelector: selector,
    extractedAt: new Date().toISOString()
  }));

  return {
    rows,
    summary: {
      totalScanned: rows.length,
      validResults: rows.length,
      uniqueResults: rows.length,
      duplicates: 0,
      rejectedResults: 0,
      namesExtracted: mode === "name" ? rows.length : 0,
      usernamesExtracted: mode === "username" ? rows.length : 0
    }
  };
}

function getBrowserApi(): BrowserApi {
  const browser = (globalThis as { chrome?: BrowserApi }).chrome;
  if (!browser) throw new Error("Chrome extension APIs are unavailable.");
  return browser;
}
