import type { ExtractionRow } from "./types";

export type TxtFormat = "name" | "username" | "name-username" | "cleaned" | "custom";

export function exportRowsAsTxt(rows: ExtractionRow[], format: TxtFormat = "cleaned", separator = " | "): string {
  return rows
    .filter((row) => row.status === "valid")
    .map((row) => {
      if (format === "name") return row.name ?? row.cleanedValue;
      if (format === "username") return row.username ?? row.cleanedValue;
      if (format === "name-username" || format === "custom") return [row.name, row.username].filter(Boolean).join(separator);
      return row.cleanedValue;
    })
    .join("\n");
}

export function exportRowsAsCsv(rows: ExtractionRow[], columns = defaultCsvColumns): string {
  const header = columns.join(",");
  const body = rows.map((row) => columns.map((column) => csvEscape(String(row[column] ?? ""))).join(","));
  return [header, ...body].join("\n");
}

export function createExportFilename(mode: string, domain: string, ext: "txt" | "csv" | "json", date = new Date()): string {
  const safeDomain = domain.replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/g, "").toLocaleLowerCase() || "local";
  return `sift_${mode}_${safeDomain}_${date.toISOString().slice(0, 10)}.${ext}`;
}

const defaultCsvColumns: Array<keyof ExtractionRow> = [
  "name",
  "username",
  "rawValue",
  "cleanedValue",
  "type",
  "status",
  "rejectionReason",
  "sourceDomain",
  "sourceSelector",
  "extractedAt"
];

function csvEscape(value: string): string {
  if (!/[",\n]/u.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}
