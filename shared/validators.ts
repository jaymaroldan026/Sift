import { z } from "zod";
import type { ExtractionConfig } from "./types";
import { createConfig } from "./filters";

export const extractionRowSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  username: z.string().optional(),
  rawValue: z.string(),
  cleanedValue: z.string(),
  type: z.enum(["name", "username", "pair"]),
  status: z.enum(["valid", "rejected", "duplicate", "deleted"]),
  rejectionReason: z.string().optional(),
  sourceDomain: z.string(),
  sourceSelector: z.string().optional(),
  extractedAt: z.string()
});

export const extractionSessionCreateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  domain: z.string().min(1),
  mode: z.enum(["name", "username", "both"]),
  sourceType: z.enum(["visible-page", "selector", "cards", "table", "links", "manual", "file"]),
  rows: z.array(extractionRowSchema).max(20000),
  presetId: z.string().optional()
});

export const presetCreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
  config: z.custom<ExtractionConfig>((value) => {
    try {
      createConfig(value as Partial<ExtractionConfig>);
      return true;
    } catch {
      return false;
    }
  })
});

export const exportRequestSchema = z.object({
  rows: z.array(extractionRowSchema),
  format: z.enum(["txt", "csv", "json"]),
  txtFormat: z.enum(["name", "username", "name-username", "cleaned", "custom"]).optional(),
  separator: z.string().optional(),
  columns: z.array(z.string()).optional()
});
