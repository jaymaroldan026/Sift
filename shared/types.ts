export type ExtractionMode = "name" | "username" | "both";
export type SourceType = "visible-page" | "selector" | "cards" | "table" | "links" | "manual" | "file";
export type RowType = "name" | "username" | "pair";
export type RowStatus = "valid" | "rejected" | "duplicate" | "deleted";
export type InvalidCharacterHandling = "exclude" | "remove";

export interface NameFilterOptions {
  removeEmoji: boolean;
  removeNumbers: boolean;
  removePunctuation: boolean;
  keepAccentedCharacters: boolean;
  allowUnicodeLetters: boolean;
  removeParenthesesText: boolean;
  separator?: string;
  removeAfterSeparator: boolean;
  prefixes: string[];
  suffixes: string[];
  minLength: number;
  maxLength: number;
  minWords: number;
  maxWords: number;
  titleCase: boolean;
  preserveCapitalization: boolean;
  excludedWords: string[];
  requiredWords: string[];
}

export interface UsernameFilterOptions {
  lettersOnly: boolean;
  lowercase: boolean;
  removeLeadingAt: boolean;
  excludeNumbers: boolean;
  excludeSymbols: boolean;
  excludeSpaces: boolean;
  allowUnderscores: boolean;
  allowPeriods: boolean;
  allowHyphens: boolean;
  requiredPrefix?: string;
  requiredSuffix?: string;
  excludedPrefix?: string;
  excludedSuffix?: string;
  requiredWord?: string;
  excludedWords: string[];
  startsWith?: string;
  endsWith?: string;
  contains?: string;
  doesNotContain?: string;
  minLength: number;
  maxLength: number;
  regex?: string;
  caseSensitive: boolean;
  invalidCharacterHandling: InvalidCharacterHandling;
}

export interface ExtractionConfig {
  mode: ExtractionMode;
  sourceType: SourceType;
  sourceDomain: string;
  selector?: string;
  parentSelector?: string;
  nameSelector?: string;
  usernameSelector?: string;
  maxItems: number;
  duplicateStrategy: "case-insensitive" | "exact";
  keepDuplicate: "first" | "last";
  nameOptions: NameFilterOptions;
  usernameOptions: UsernameFilterOptions;
}

export interface ExtractionInput {
  mode?: ExtractionMode;
  sourceType?: SourceType;
  sourceDomain: string;
  selector?: string;
  config?: Omit<Partial<ExtractionConfig>, "nameOptions" | "usernameOptions"> & {
    nameOptions?: Partial<NameFilterOptions>;
    usernameOptions?: Partial<UsernameFilterOptions>;
  };
}

export interface ExtractionRow {
  id: string;
  name?: string;
  username?: string;
  rawValue: string;
  cleanedValue: string;
  type: RowType;
  status: RowStatus;
  rejectionReason?: string;
  sourceDomain: string;
  sourceSelector?: string;
  extractedAt: string;
}

export interface ExtractionSummary {
  totalScanned: number;
  validResults: number;
  uniqueResults: number;
  duplicates: number;
  rejectedResults: number;
  namesExtracted: number;
  usernamesExtracted: number;
}

export interface ExtractionSession {
  id: string;
  name: string;
  domain: string;
  mode: ExtractionMode;
  sourceType: SourceType;
  rows: ExtractionRow[];
  summary: ExtractionSummary;
  presetId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Preset {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  config: ExtractionConfig;
  createdAt: string;
  updatedAt: string;
}

export interface SelectorSuggestion {
  selector: string;
  label: string;
  confidence: number;
  sample: string;
  count: number;
}

export interface ExtractionResult {
  rows: ExtractionRow[];
  summary: ExtractionSummary;
}
