import { Router } from "express";
import { presetCreateSchema } from "../../../shared/validators";
import { createConfig } from "../../../shared/filters";
import type { Preset } from "../../../shared/types";
import type { SiftDatabase } from "../database/db";

export function createPresetRouter(database: SiftDatabase) {
  const router = Router();

  router.get("/", (_request, response) => {
    response.json({ presets: database.listPresets() });
  });

  router.post("/", (request, response) => {
    const parsed = presetCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid preset", details: parsed.error.flatten() });
      return;
    }
    const now = new Date().toISOString();
    const preset: Preset = {
      id: createId("preset"),
      name: parsed.data.name,
      description: parsed.data.description,
      isDefault: parsed.data.isDefault ?? false,
      config: createConfig(parsed.data.config),
      createdAt: now,
      updatedAt: now
    };
    response.status(201).json(database.savePreset(preset));
  });

  router.put("/:id", (request, response) => {
    const parsed = presetCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid preset", details: parsed.error.flatten() });
      return;
    }
    const updated = database.updatePreset(request.params.id, {
      name: parsed.data.name,
      description: parsed.data.description,
      isDefault: parsed.data.isDefault ?? false,
      config: createConfig(parsed.data.config),
      updatedAt: new Date().toISOString()
    });
    if (!updated) {
      response.status(404).json({ error: "Preset not found" });
      return;
    }
    response.json(updated);
  });

  router.delete("/:id", (request, response) => {
    if (!database.deletePreset(request.params.id)) {
      response.status(404).json({ error: "Preset not found" });
      return;
    }
    response.status(204).send();
  });

  return router;
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
