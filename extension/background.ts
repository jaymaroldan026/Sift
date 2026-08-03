chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "SIFT_START_SELECTOR") return false;

  chrome.scripting
    .executeScript({ target: { tabId: message.tabId }, files: ["selector-mode.js"] })
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
