# Sift Design

## Goal

Build Sift as a local-first Chromium extension plus dashboard that extracts names, usernames, or paired name/username rows from rendered page text, selected selectors, pasted text, imported files, tables, links, and repeated cards.

## Architecture

Sift uses a TypeScript monorepo with shared extraction and validation logic consumed by three surfaces:

- `extension/`: Manifest V3 popup, content script, selector mode, and service worker.
- `server/`: localhost Express API with SQLite-backed presets and extraction sessions.
- `dashboard/`: Vite React app for configuration, previews, results, history, presets, and exports.
- `shared/`: pure extraction, filtering, validation, export, and type utilities.

All processing remains local. The extension reads only the active tab's rendered DOM and sends structured results to `http://127.0.0.1:5174`. The server binds to localhost and persists data under `server/database/sift.sqlite`.

## Behavior

Default name extraction removes emoji, zero-width characters, and excess whitespace while preserving accented letters, ordinary punctuation, spaces, apostrophes, hyphens, periods, and capitalization.

Default username extraction removes a leading `@`, lowercases the value, requires letters only, excludes numbers/spaces/symbols, enforces the configurable 8-12 character range, deduplicates case-insensitively, and records clear rejection reasons.

Paired extraction uses a parent selector with child selectors for names and usernames so rows preserve relationships within cards or table rows.

Selector mode highlights hovered DOM elements, shows tag/class/selector details, generates a stable selector, previews matches, and can be canceled with Escape.

## UI

The dashboard follows the SnapBoard reference at a lighter, extraction-focused density: off-white background, white cards, dark text, soft yellow accent, compact controls, readable tables, and collapsible advanced options. The popup is 360-420px wide and exposes scan, extract, selector, dashboard, status, count, and notification controls without excessive scrolling.

## Data Flow

1. Popup requests page data from content script.
2. Content script extracts page text, selected selector text, links, tables, cards, or auto-detection suggestions.
3. Shared utilities clean, validate, pair, deduplicate, and preview rows.
4. Popup sends sessions and presets to the local API.
5. Dashboard fetches sessions/presets, allows edits, exports selected/all rows, and saves changes locally.

## Error Handling

Sift reports local server unavailability, unsupported browser pages, no selector matches, invalid selectors, invalid regex, large result limits, export failures, database failures, clipboard failures, and extraction cancellation with readable messages.

## Testing

Vitest covers shared cleaning, validation, duplicate detection, pairing, exports, presets, and server routes. Playwright covers the dashboard smoke flow after the production build.
