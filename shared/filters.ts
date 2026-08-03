import type {
  ExtractionConfig,
  ExtractionRow,
  ExtractionSummary,
  InvalidCharacterHandling,
  NameFilterOptions,
  RowStatus,
  UsernameFilterOptions
} from "./types";

const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/gu;
const EMOJI_RE = /[\p{Extended_Pictographic}\uFE0E\uFE0F]/gu;
const NUMBER_RE = /\p{Number}/u;
const SPACE_RE = /\s/u;
const SYMBOL_RE = /[^\p{Letter}]/u;

export const defaultNameOptions: NameFilterOptions = {
  removeEmoji: false,
  removeNumbers: false,
  removePunctuation: false,
  keepAccentedCharacters: true,
  allowUnicodeLetters: true,
  removeParenthesesText: false,
  removeAfterSeparator: false,
  prefixes: [],
  suffixes: [],
  minLength: 1,
  maxLength: 80,
  minWords: 1,
  maxWords: 12,
  titleCase: false,
  preserveCapitalization: true,
  excludedWords: [],
  requiredWords: []
};

export const defaultUsernameOptions: UsernameFilterOptions = {
  lettersOnly: false,
  lowercase: false,
  removeLeadingAt: true,
  excludeNumbers: false,
  excludeSymbols: true,
  excludeSpaces: true,
  allowUnderscores: false,
  allowPeriods: false,
  allowHyphens: false,
  excludedWords: [],
  minLength: 1,
  maxLength: 15,
  caseSensitive: false,
  invalidCharacterHandling: "exclude"
};

export const defaultExtractionConfig: ExtractionConfig = {
  mode: "username",
  sourceType: "visible-page",
  sourceDomain: "local",
  maxItems: 10000,
  duplicateStrategy: "case-insensitive",
  keepDuplicate: "first",
  nameOptions: defaultNameOptions,
  usernameOptions: defaultUsernameOptions
};

export interface CleanResult {
  raw: string;
  cleaned: string;
  status: RowStatus;
  rejectionReason?: string;
}

export type ExtractionConfigInput = Omit<Partial<ExtractionConfig>, "nameOptions" | "usernameOptions"> & {
  nameOptions?: Partial<NameFilterOptions>;
  usernameOptions?: Partial<UsernameFilterOptions> & { invalidCharacterHandling?: InvalidCharacterHandling };
};

export function createConfig(config?: ExtractionConfigInput): ExtractionConfig {
  return {
    ...defaultExtractionConfig,
    ...config,
    nameOptions: { ...defaultNameOptions, ...config?.nameOptions },
    usernameOptions: { ...defaultUsernameOptions, ...config?.usernameOptions }
  };
}

export function countCharacters(value: string): number {
  return [...value].length;
}

export function stripInvisible(value: string): string {
  return value.replace(ZERO_WIDTH_RE, "");
}

export function normalizeSpaces(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

export function cleanName(raw: string, options: Partial<NameFilterOptions> = {}): CleanResult {
  const merged = { ...defaultNameOptions, ...options };
  let cleaned = stripInvisible(raw);

  if (merged.removeEmoji) cleaned = cleaned.replace(EMOJI_RE, "");
  if (merged.removeParenthesesText) cleaned = cleaned.replace(/\([^)]*\)/gu, "");
  if (merged.separator && merged.removeAfterSeparator) cleaned = cleaned.split(merged.separator)[0] ?? cleaned;
  for (const prefix of merged.prefixes.filter(Boolean)) {
    cleaned = cleaned.replace(new RegExp(`^${escapeRegex(prefix)}\\s*`, "iu"), "");
  }
  for (const suffix of merged.suffixes.filter(Boolean)) {
    cleaned = cleaned.replace(new RegExp(`\\s*${escapeRegex(suffix)}$`, "iu"), "");
  }
  if (merged.removeNumbers) cleaned = cleaned.replace(/\p{Number}+/gu, "");
  if (merged.removePunctuation) cleaned = cleaned.replace(/[^\p{Letter}\s]/gu, "");
  if (!merged.allowUnicodeLetters) cleaned = cleaned.replace(/[^A-Za-z\s'.-]/g, "");
  if (merged.titleCase) {
    cleaned = cleaned.toLocaleLowerCase().replace(/\b\p{Letter}/gu, (char) => char.toLocaleUpperCase());
  }

  cleaned = normalizeSpaces(cleaned);
  const words = cleaned.length ? cleaned.split(/\s+/u) : [];

  if (!cleaned) return rejected(raw, cleaned, "Empty after cleaning");
  if (countCharacters(cleaned) < merged.minLength) return rejected(raw, cleaned, "Below minimum length");
  if (countCharacters(cleaned) > merged.maxLength) return rejected(raw, cleaned, "Above maximum length");
  if (words.length < merged.minWords) return rejected(raw, cleaned, "Below minimum word count");
  if (words.length > merged.maxWords) return rejected(raw, cleaned, "Above maximum word count");
  if (merged.excludedWords.some((word) => containsWord(cleaned, word))) return rejected(raw, cleaned, "Excluded word found");
  if (merged.requiredWords.length && !merged.requiredWords.every((word) => containsWord(cleaned, word))) {
    return rejected(raw, cleaned, "Required word missing");
  }

  return { raw, cleaned, status: "valid" };
}

export function cleanUsername(raw: string, options: Partial<UsernameFilterOptions> = {}): CleanResult {
  const merged = normalizeUsernameOptions({ ...defaultUsernameOptions, ...options });
  let cleaned = stripInvisible(raw).trim();

  if (merged.removeLeadingAt) cleaned = cleaned.replace(/^@+/u, "");
  if (merged.lowercase) cleaned = cleaned.toLocaleLowerCase();

  if (merged.invalidCharacterHandling === "remove") {
    cleaned = removeConfiguredInvalidCharacters(cleaned, merged);
  } else {
    const rejection = firstUsernameRejection(cleaned, merged);
    if (rejection) return rejected(raw, cleaned, rejection);
  }

  cleaned = normalizeSpaces(cleaned).replace(/\s+/gu, "");

  if (!cleaned) return rejected(raw, cleaned, "Empty after cleaning");
  const postRemovalRejection = firstUsernameRuleRejection(cleaned, merged);
  if (postRemovalRejection) return rejected(raw, cleaned, postRemovalRejection);
  if (countCharacters(cleaned) < merged.minLength) return rejected(raw, cleaned, "Below minimum length");
  if (countCharacters(cleaned) > merged.maxLength) return rejected(raw, cleaned, "Above maximum length");

  return { raw, cleaned, status: "valid" };
}

export function normalizeUsernameOptions(options: UsernameFilterOptions): UsernameFilterOptions {
  if (!options.lettersOnly) return options;
  return {
    ...options,
    allowHyphens: false,
    allowPeriods: false,
    allowUnderscores: false,
    excludeNumbers: true,
    excludeSymbols: true,
    excludeSpaces: true
  };
}

export function dedupeRows(rows: ExtractionRow[], strategy: "case-insensitive" | "exact" = "case-insensitive"): ExtractionRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    if (row.status !== "valid") return row;
    const key = duplicateKey(row, strategy);
    if (seen.has(key)) {
      return { ...row, status: "duplicate", rejectionReason: "Duplicate value" };
    }
    seen.add(key);
    return row;
  });
}

export function summarizeRows(rows: ExtractionRow[]): ExtractionSummary {
  return {
    totalScanned: rows.length,
    validResults: rows.filter((row) => row.status === "valid").length,
    uniqueResults: rows.filter((row) => row.status === "valid").length,
    duplicates: rows.filter((row) => row.status === "duplicate").length,
    rejectedResults: rows.filter((row) => row.status === "rejected").length,
    namesExtracted: rows.filter((row) => row.status === "valid" && (row.type === "name" || row.type === "pair")).length,
    usernamesExtracted: rows.filter((row) => row.status === "valid" && (row.type === "username" || row.type === "pair")).length
  };
}

function firstUsernameRejection(value: string, options: UsernameFilterOptions): string | undefined {
  if (options.excludeSpaces && SPACE_RE.test(value)) return "Contains whitespace";
  if (options.excludeNumbers && NUMBER_RE.test(value)) return "Contains number";
  if (options.excludeSymbols && hasDisallowedSymbol(value, options)) return "Contains symbol";
  return firstUsernameRuleRejection(value, options);
}

function firstUsernameRuleRejection(value: string, options: UsernameFilterOptions): string | undefined {
  const compare = options.caseSensitive ? value : value.toLocaleLowerCase();
  const norm = (text?: string) => (options.caseSensitive ? text ?? "" : (text ?? "").toLocaleLowerCase());

  if (options.lettersOnly && /[^\p{Letter}]/u.test(value)) return "Contains symbol";
  if (!options.lettersOnly && /[^\p{Letter}\p{Number}]/u.test(value)) return "Contains symbol";
  if (options.requiredPrefix && !compare.startsWith(norm(options.requiredPrefix))) return "Required prefix missing";
  if (options.requiredSuffix && !compare.endsWith(norm(options.requiredSuffix))) return "Required suffix missing";
  if (options.excludedPrefix && compare.startsWith(norm(options.excludedPrefix))) return "Excluded prefix found";
  if (options.excludedSuffix && compare.endsWith(norm(options.excludedSuffix))) return "Excluded suffix found";
  if (options.requiredWord && !compare.includes(norm(options.requiredWord))) return "Required word missing";
  if (options.excludedWords.some((word) => compare.includes(norm(word)))) return "Excluded word found";
  if (options.startsWith && !compare.startsWith(norm(options.startsWith))) return "Starts with rule failed";
  if (options.endsWith && !compare.endsWith(norm(options.endsWith))) return "Ends with rule failed";
  if (options.contains && !compare.includes(norm(options.contains))) return "Contains rule failed";
  if (options.doesNotContain && compare.includes(norm(options.doesNotContain))) return "Does not contain rule failed";
  if (options.regex) {
    try {
      const flags = options.caseSensitive ? "u" : "iu";
      if (!new RegExp(options.regex, flags).test(value)) return "Regular expression filter failed";
    } catch {
      return "Invalid regular expression";
    }
  }
  return undefined;
}

function removeConfiguredInvalidCharacters(value: string, options: UsernameFilterOptions): string {
  return [...value]
    .filter((char) => {
      if (/\p{Letter}/u.test(char)) return true;
      if (options.allowUnderscores && char === "_") return true;
      if (options.allowPeriods && char === ".") return true;
      if (options.allowHyphens && char === "-") return true;
      return false;
    })
    .join("");
}

function hasDisallowedSymbol(value: string, options: UsernameFilterOptions): boolean {
  return [...value].some((char) => {
    if (/\p{Letter}/u.test(char) || /\p{Number}/u.test(char) || /\s/u.test(char)) return false;
    if (options.allowUnderscores && char === "_") return false;
    if (options.allowPeriods && char === ".") return false;
    if (options.allowHyphens && char === "-") return false;
    return SYMBOL_RE.test(char) || true;
  });
}

function duplicateKey(row: ExtractionRow, strategy: "case-insensitive" | "exact"): string {
  const value = row.type === "pair" ? `${row.name ?? ""}|${row.username ?? ""}` : row.cleanedValue;
  return strategy === "case-insensitive" ? value.toLocaleLowerCase() : value;
}

function rejected(raw: string, cleaned: string, rejectionReason: string): CleanResult {
  return { raw, cleaned, status: "rejected", rejectionReason };
}

function containsWord(value: string, word: string): boolean {
  if (!word.trim()) return false;
  return new RegExp(`(^|\\s)${escapeRegex(word.trim())}(\\s|$)`, "iu").test(value);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
