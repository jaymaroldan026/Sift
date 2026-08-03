import cors from "cors";
import express from "express";
import { exportRowsAsCsv, exportRowsAsTxt } from "../../shared/exporters";
import { summarizeRows } from "../../shared/filters";
import { exportRequestSchema } from "../../shared/validators";
import type { SiftDatabase } from "./database/db";
import { createExtractionRouter } from "./routes/extractions";
import { createPresetRouter } from "./routes/presets";

export function createApp(database: SiftDatabase) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: [/^http:\/\/127\.0\.0\.1:\d+$/u, /^http:\/\/localhost:\d+$/u, /^chrome-extension:\/\//u] }));
  app.use(express.json({ limit: "20mb" }));

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok", version: "0.1.11", storage: "sqlite", time: new Date().toISOString() });
  });

  app.use("/api/extractions", createExtractionRouter(database));
  app.use("/api/presets", createPresetRouter(database));

  app.post("/api/export", (request, response) => {
    const parsed = exportRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid export request", details: parsed.error.flatten() });
      return;
    }

    const { rows, format } = parsed.data;
    response.setHeader("x-sift-valid-count", String(summarizeRows(rows).validResults));
    if (format === "json") {
      response.type("application/json").send(JSON.stringify(rows, null, 2));
      return;
    }
    if (format === "txt") {
      response.type("text/plain").send(exportRowsAsTxt(rows, parsed.data.txtFormat, parsed.data.separator));
      return;
    }
    response.type("text/csv").send(exportRowsAsCsv(rows, parsed.data.columns as never));
  });

  app.use((request, response) => {
    response.status(404).json({ error: "Not found", path: request.path });
  });

  return app;
}
