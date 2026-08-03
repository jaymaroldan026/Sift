# Sift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a working local-first Sift Chromium extension, dashboard, API, tests, and release artifact.

**Architecture:** Shared TypeScript utilities define extraction behavior once. The Manifest V3 extension reads active page DOM and posts results to a localhost Express API. The React dashboard presents configuration, previews, results, history, presets, and exports from the API.

**Tech Stack:** TypeScript, React, Vite, Express, SQLite via better-sqlite3, Zod, Vitest, Playwright, GitHub CLI.

---

### Task 1: Project Shell And Tests

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `tests/unit/filters.test.ts`
- Create: `tests/unit/extractor.test.ts`

- [ ] **Step 1: Write failing tests for extraction defaults**

```ts
import { describe, expect, it } from "vitest";
import { cleanName, cleanUsername, extractFromText } from "../../shared/filters";

describe("Sift cleaning defaults", () => {
  it("removes emoji and zero-width characters from names while preserving accents and punctuation", () => {
    expect(cleanName("✨ Chloé Rose \u200B-Jr. 🌹").cleaned).toBe("Chloé Rose -Jr.");
  });

  it("rejects default usernames containing numbers or symbols after removing a leading at sign", () => {
    expect(cleanUsername("@chloe123").status).toBe("rejected");
    expect(cleanUsername("@chloe.rose").rejectionReason).toBe("Contains symbol");
  });

  it("extracts valid default names and usernames from sample text", () => {
    const result = extractFromText("Chloe Rose 🌹\n@chloerose\nchloe123\n✨ Olivia Honey ✨\n@oliviahoney", {
      mode: "both",
      sourceDomain: "example.com"
    });
    expect(result.rows.filter((row) => row.status === "valid")).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm test -- tests/unit/filters.test.ts tests/unit/extractor.test.ts`

- [ ] **Step 3: Implement shared filters and extractor**

Create `shared/types.ts`, `shared/filters.ts`, `shared/validators.ts`, and `shared/exporters.ts` with pure functions for cleaning, validation, deduplication, pairing, and export formatting.

- [ ] **Step 4: Run tests and verify they pass**

Run: `npm test -- tests/unit/filters.test.ts tests/unit/extractor.test.ts`

### Task 2: Local API

**Files:**
- Create: `server/src/index.ts`
- Create: `server/src/database/db.ts`
- Create: `server/src/routes/extractions.ts`
- Create: `server/src/routes/presets.ts`
- Create: `tests/integration/server.test.ts`

- [ ] **Step 1: Write failing route tests**

Test health, preset create/list/update/delete, extraction create/list/detail/delete, and export CSV.

- [ ] **Step 2: Implement localhost Express API**

Use Zod validation, SQLite persistence, clear JSON errors, CORS for localhost dashboard/extension origins, and JSON export responses.

- [ ] **Step 3: Run server tests**

Run: `npm test -- tests/integration/server.test.ts`

### Task 3: Extension

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/popup.html`
- Create: `extension/popup.ts`
- Create: `extension/content-script.ts`
- Create: `extension/background.ts`
- Create: `extension/selector-mode.ts`
- Create: `extension/styles/popup.css`
- Create: `extension/vite.config.ts`

- [ ] **Step 1: Implement popup and content-script extraction**

Connect popup controls to active-tab scanning, selector mode, dashboard opening, status checks, and API posting.

- [ ] **Step 2: Build extension**

Run: `npm run build:extension`

### Task 4: Dashboard

**Files:**
- Create: `dashboard/src/App.tsx`
- Create: `dashboard/src/main.tsx`
- Create: `dashboard/src/styles.css`
- Create: `dashboard/src/lib/api.ts`
- Create: `dashboard/vite.config.ts`
- Create: `dashboard/index.html`

- [ ] **Step 1: Implement dashboard views**

Add header, summary cards, extraction configuration, preview, results table, history, presets, export controls, advanced filter sections, and responsive styling.

- [ ] **Step 2: Build dashboard**

Run: `npm run build:dashboard`

### Task 5: Docs, Package, And Release

**Files:**
- Create: `README.md`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `scripts/build-extension.mjs`

- [ ] **Step 1: Run verification**

Run: `npm run typecheck`, `npm test`, `npm run build`.

- [ ] **Step 2: Package release**

Run: `npm run package:release`.

- [ ] **Step 3: Publish to GitHub**

Initialize git if needed, commit the intended files, create a GitHub repo named `Sift`, push `main`, create tag `v0.1.0`, and publish a GitHub release with the packaged extension archive.
