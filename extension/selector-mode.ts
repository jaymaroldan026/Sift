(() => {
  const existing = document.querySelector("#sift-selector-overlay");
  existing?.remove();

  const overlay = document.createElement("div");
  overlay.id = "sift-selector-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: "2147483646",
    border: "2px solid #fff36a",
    background: "rgba(255, 243, 106, 0.14)",
    borderRadius: "8px",
    transition: "all 80ms ease"
  });

  const tooltip = document.createElement("div");
  Object.assign(tooltip.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: "2147483647",
    padding: "8px 10px",
    borderRadius: "10px",
    background: "#161616",
    color: "#ffffff",
    font: "12px/1.4 Inter, system-ui, sans-serif",
    maxWidth: "320px",
    boxShadow: "0 8px 24px rgba(0,0,0,.22)"
  });

  document.documentElement.append(overlay, tooltip);

  let hovered: Element | null = null;

  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeydown, true);

  function onMove(event: MouseEvent) {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target || target === overlay || target === tooltip) return;
    hovered = target;
    const rect = target.getBoundingClientRect();
    Object.assign(overlay.style, {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });
    const selector = buildSelector(target);
    const count = safeCount(selector);
    tooltip.textContent = `${target.tagName.toLowerCase()} ${selector} (${count} matches)`;
    tooltip.style.top = `${Math.min(event.clientY + 14, window.innerHeight - 48)}px`;
    tooltip.style.left = `${Math.min(event.clientX + 14, window.innerWidth - 330)}px`;
  }

  function onClick(event: MouseEvent) {
    if (!hovered) return;
    event.preventDefault();
    event.stopPropagation();
    const selector = buildSelector(hovered);
    chrome.runtime.sendMessage({ type: "SIFT_SELECTOR_CHOSEN", selector, count: safeCount(selector), domain: location.hostname });
    cleanup();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") cleanup();
  }

  function cleanup() {
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeydown, true);
    overlay.remove();
    tooltip.remove();
  }

  function buildSelector(element: Element): string {
    if (element.id && !looksGenerated(element.id)) return `#${CSS.escape(element.id)}`;
    const dataSelector = Array.from(element.attributes).find((attr) => attr.name.startsWith("data-") && attr.value && !looksGenerated(attr.value));
    if (dataSelector) return `${element.tagName.toLowerCase()}[${dataSelector.name}="${CSS.escape(dataSelector.value)}"]`;
    const stableClass = Array.from(element.classList).find((className) => !looksGenerated(className));
    if (stableClass) return `${element.tagName.toLowerCase()}.${CSS.escape(stableClass)}`;

    const parent = element.parentElement;
    if (!parent) return element.tagName.toLowerCase();
    const index = Array.from(parent.children).indexOf(element) + 1;
    return `${buildSelector(parent)} > ${element.tagName.toLowerCase()}:nth-child(${index})`;
  }

  function safeCount(selector: string): number {
    try {
      return document.querySelectorAll(selector).length;
    } catch {
      return 0;
    }
  }

  function looksGenerated(value: string): boolean {
    return /(^|[-_])[a-f0-9]{6,}|css-[a-z0-9]+|[0-9]{4,}/iu.test(value);
  }
})();
