import { extractSnapBoardValues, hasSnapBoardResults } from "../shared/snapboard";
import type { ExtractionMode } from "../shared/types";

type ScanRequest = { type: "SIFT_SCAN_PAGE" };
type SnapBoardRequest = { type: "SIFT_SCAN_SNAPBOARD"; mode: Exclude<ExtractionMode, "both"> };

chrome.runtime.onMessage.addListener((message: ScanRequest | SnapBoardRequest, _sender, sendResponse) => {
  if (message.type === "SIFT_SCAN_PAGE") {
    sendResponse({
      text: getVisibleText(),
      snapBoard: getSnapBoardSnapshot(),
      links: Array.from(document.links).map((link) => link.href),
      domain: location.hostname,
      title: document.title
    });
    return true;
  }
  if (message.type === "SIFT_SCAN_SNAPBOARD") {
    sendResponse({
      values: extractSnapBoardValues(document, message.mode),
      domain: location.hostname,
      selector: message.mode === "username" ? ".username-value" : ".display-value"
    });
    return true;
  }
  return false;
});

function getVisibleText(): string {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.textContent?.trim();
      const parent = node.parentElement;
      if (!text || !parent) return NodeFilter.FILTER_REJECT;
      const style = window.getComputedStyle(parent);
      if (style.visibility === "hidden" || style.display === "none") return NodeFilter.FILTER_REJECT;
      if (parent.closest("script, style, noscript, textarea, input")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const chunks: string[] = [];
  while (walker.nextNode() && chunks.length < 10000) {
    const text = walker.currentNode.textContent?.trim();
    if (text) chunks.push(text);
  }
  return chunks.join("\n");
}

function getSnapBoardSnapshot() {
  if (!hasSnapBoardResults(document)) return undefined;
  return {
    usernames: extractSnapBoardValues(document, "username"),
    names: extractSnapBoardValues(document, "name")
  };
}
