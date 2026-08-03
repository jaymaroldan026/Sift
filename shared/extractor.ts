import type { ExtractionInput, ExtractionResult, ExtractionRow } from "./types";
import {
  cleanName,
  cleanUsername,
  createConfig,
  dedupeRows,
  summarizeRows
} from "./filters";

type CardInput = { name?: string; username?: string; raw?: string; selector?: string };

export function extractFromText(text: string, input: ExtractionInput): ExtractionResult {
  const config = createConfig({ ...input.config, mode: input.mode ?? input.config?.mode, sourceDomain: input.sourceDomain });
  const lines = text
    .split(/\r?\n|[,;]+/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, config.maxItems);

  const rows: ExtractionRow[] = [];
  for (const raw of lines) {
    if (config.mode === "name" || config.mode === "both") {
      const name = cleanName(raw, config.nameOptions);
      if (looksLikeName(raw) || config.mode === "name") rows.push(rowFromClean(name, "name", input.sourceDomain, input.selector));
    }
    if (config.mode === "username" || config.mode === "both") {
      const username = cleanUsername(raw, config.usernameOptions);
      if (looksLikeUsername(raw) || username.status === "valid" || config.mode === "username") {
        rows.push(rowFromClean(username, "username", input.sourceDomain, input.selector));
      }
    }
  }

  return finish(rows, config.duplicateStrategy);
}

export function extractFromCards(cards: CardInput[], input: Omit<ExtractionInput, "mode">): ExtractionResult {
  const config = createConfig({ ...input.config, mode: "both", sourceDomain: input.sourceDomain });
  const rows = cards.slice(0, config.maxItems).map((card) => {
    const name = cleanName(card.name ?? "", config.nameOptions);
    const username = cleanUsername(card.username ?? "", config.usernameOptions);
    const status = name.status === "valid" && username.status === "valid" ? "valid" : "rejected";
    return {
      id: createId(),
      name: name.cleaned,
      username: username.cleaned,
      rawValue: card.raw ?? `${card.name ?? ""} ${card.username ?? ""}`.trim(),
      cleanedValue: `${name.cleaned} | ${username.cleaned}`,
      type: "pair",
      status,
      rejectionReason:
        status === "valid" ? undefined : name.rejectionReason ?? username.rejectionReason ?? "Missing name or username",
      sourceDomain: input.sourceDomain,
      sourceSelector: card.selector ?? input.selector,
      extractedAt: new Date().toISOString()
    } satisfies ExtractionRow;
  });

  return finish(rows, config.duplicateStrategy);
}

export function extractFromLinks(links: string[], input: Omit<ExtractionInput, "mode">): ExtractionResult {
  const rows = links.map((link) => {
    const finalSegment = link.split(/[?#]/u)[0]?.split("/").filter(Boolean).at(-1) ?? link;
    return rowFromClean(cleanUsername(decodeURIComponent(finalSegment)), "username", input.sourceDomain, input.selector);
  });

  return finish(rows);
}

export function extractFromTable(table: string[][], input: Omit<ExtractionInput, "mode">): ExtractionResult {
  const [header = [], ...rows] = table;
  const lower = header.map((cell) => cell.toLocaleLowerCase());
  const nameIndex = Math.max(0, lower.findIndex((cell) => cell.includes("name")));
  const usernameIndex = Math.max(1, lower.findIndex((cell) => cell.includes("user") || cell.includes("handle")));

  return extractFromCards(
    rows.map((row) => ({
      name: row[nameIndex],
      username: row[usernameIndex],
      raw: row.join(" | ")
    })),
    input
  );
}

export function previewRows(result: ExtractionResult, count = 25): ExtractionResult {
  const rows = result.rows.slice(0, count);
  return { rows, summary: summarizeRows(rows) };
}

function rowFromClean(
  clean: ReturnType<typeof cleanName>,
  type: "name" | "username",
  sourceDomain: string,
  sourceSelector?: string
): ExtractionRow {
  return {
    id: createId(),
    rawValue: clean.raw,
    cleanedValue: clean.cleaned,
    name: type === "name" && clean.status === "valid" ? clean.cleaned : undefined,
    username: type === "username" && clean.status === "valid" ? clean.cleaned : undefined,
    type,
    status: clean.status,
    rejectionReason: clean.rejectionReason,
    sourceDomain,
    sourceSelector,
    extractedAt: new Date().toISOString()
  };
}

function finish(rows: ExtractionRow[], strategy: "case-insensitive" | "exact" = "case-insensitive"): ExtractionResult {
  const deduped = dedupeRows(rows, strategy);
  return { rows: deduped, summary: summarizeRows(deduped) };
}

function looksLikeUsername(value: string): boolean {
  return value.trim().startsWith("@") || /^[A-Za-z0-9._-]{3,32}$/u.test(value.trim());
}

function looksLikeName(value: string): boolean {
  return /\p{Letter}/u.test(value) && !value.trim().startsWith("@") && /\s/u.test(value.trim());
}

function createId(): string {
  return `row_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
