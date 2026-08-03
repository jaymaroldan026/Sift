const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/gu;
const EMOJI_RE = /[\p{Extended_Pictographic}\p{Emoji_Presentation}\u00B0\u00B7\u02DA\u203C\u2049\u2122\u2139\u2194-\u21AA\u231A-\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA-\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u27BF\u2934-\u2935\u2B05-\u2B55\u3030\u303D\u3297\u3299\uFE0E\uFE0F]/gu;
const EMOJI_TEST_RE = /[\p{Extended_Pictographic}\p{Emoji_Presentation}\u00B0\u00B7\u02DA\u203C\u2049\u2122\u2139\u2194-\u21AA\u231A-\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA-\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u27BF\u2934-\u2935\u2B05-\u2B55\u3030\u303D\u3297\u3299\uFE0E\uFE0F]/u;
const LETTER_TEST_RE = /\p{Letter}/u;

export interface ValueFilterOptions {
  removeNumbers: boolean;
  removeEmoji: boolean;
  removeEmojiOnly?: boolean;
  removeSymbols: boolean;
  removeDuplicates?: boolean;
  collapseSpaces: boolean;
  lowercase?: boolean;
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

  if (merged.removeEmojiOnly && EMOJI_TEST_RE.test(cleaned) && !LETTER_TEST_RE.test(cleaned)) return "";
  if (isOutsideLengthRange(cleaned, merged)) return "";
  if (merged.removeEmoji) cleaned = cleaned.replace(EMOJI_RE, "");
  if (merged.removeNumbers) cleaned = cleaned.replace(/\p{Number}+/gu, "");
  if (merged.removeSymbols) cleaned = cleaned.replace(/[^\p{Letter}\p{Number}\s]/gu, "");
  if (merged.collapseSpaces) cleaned = cleaned.replace(/\s+/gu, " ").trim();
  if (merged.lowercase) cleaned = cleaned.toLowerCase();
  if (isOutsideLengthRange(cleaned, merged)) return "";

  return cleaned;
}

function isOutsideLengthRange(value: string, options: Partial<ValueFilterOptions>): boolean {
  if (options.minLength && value.length < options.minLength) return true;
  if (options.maxLength && value.length > options.maxLength) return true;
  return false;
}

export function applyUniqueFilter<T extends { cleanedValue: string }>(rows: T[], enabled = false): T[] {
  if (!enabled) return rows;
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.cleanedValue.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
