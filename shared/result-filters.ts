const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/gu;
const EMOJI_RE = /[\p{Extended_Pictographic}\uFE0E\uFE0F]/gu;

export interface ValueFilterOptions {
  removeNumbers: boolean;
  removeEmoji: boolean;
  removeSymbols: boolean;
  collapseSpaces: boolean;
  minLength?: number;
  maxLength?: number;
}

export const defaultValueFilterOptions: ValueFilterOptions = {
  removeNumbers: false,
  removeEmoji: false,
  removeSymbols: false,
  collapseSpaces: true
};

export function applyValueFilters(value: string, options: Partial<ValueFilterOptions> = {}): string {
  const merged = { ...defaultValueFilterOptions, ...options };
  let cleaned = value.replace(ZERO_WIDTH_RE, "");

  if (merged.removeEmoji) cleaned = cleaned.replace(EMOJI_RE, "");
  if (merged.removeNumbers) cleaned = cleaned.replace(/\p{Number}+/gu, "");
  if (merged.removeSymbols) cleaned = cleaned.replace(/[^\p{Letter}\p{Number}\s]/gu, "");
  if (merged.collapseSpaces) cleaned = cleaned.replace(/\s+/gu, " ").trim();
  if (merged.minLength && cleaned.length < merged.minLength) return "";
  if (merged.maxLength && cleaned.length > merged.maxLength) return "";

  return cleaned;
}
