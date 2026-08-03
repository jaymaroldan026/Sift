import type { ExtractionMode } from "./types";

export const SNAPBOARD_SELECTORS = {
  card: ".result-card",
  username: ".username-value",
  name: ".display-value"
} as const;

export function extractSnapBoardValues(root: ParentNode, mode: Exclude<ExtractionMode, "both">): string[] {
  const selector = mode === "username" ? SNAPBOARD_SELECTORS.username : SNAPBOARD_SELECTORS.name;
  const cards = Array.from(root.querySelectorAll(SNAPBOARD_SELECTORS.card));
  const scopedValues = cards
    .map((card) => card.querySelector(selector)?.textContent?.trim() ?? "")
    .filter(Boolean);

  if (scopedValues.length) return uniqueValues(scopedValues);

  return uniqueValues(
    Array.from(root.querySelectorAll(selector))
      .map((element) => element.textContent?.trim() ?? "")
      .filter(Boolean)
  );
}

export function hasSnapBoardResults(root: ParentNode): boolean {
  return root.querySelector(SNAPBOARD_SELECTORS.username) !== null || root.querySelector(SNAPBOARD_SELECTORS.name) !== null;
}

function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
