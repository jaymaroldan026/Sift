# Sift

Sift is a local-first Chromium browser extension and web dashboard for extracting names, usernames, or paired name-and-username rows from text already visible in the active page DOM.

It works with Google Chrome, Microsoft Edge, and Chromium-based AdsPower profiles. Sift does not bypass authentication, CAPTCHA, access controls, private APIs, or security protections. It does not collect passwords, cookies, tokens, or credentials, and it does not send extracted data to cloud services.

## Requirements

- Node.js 20 or newer
- npm
- Google Chrome, Microsoft Edge, or another Chromium browser

## Install

```bash
npm install
```

## Run Locally

Start the local API and dashboard together:

```bash
npm run dev
```

Or start them separately:

```bash
npm run start:server
npm run dev:dashboard
```

The API runs at `http://127.0.0.1:5174`.
The dashboard runs at `http://127.0.0.1:5173`.

## Build

```bash
npm run build
```

Build only the extension:

```bash
npm run build:extension
```

The unpacked extension is generated at `dist/extension`.

## Load The Extension

1. Run `npm run build:extension`.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable developer mode.
4. Choose **Load unpacked**.
5. Select `/Users/heisnberg/Documents/Sift/dist/extension`.
6. Start the local API with `npm run start:server`.
7. Click the Sift extension icon on a regular webpage.

Do not select `/Users/heisnberg/Documents/Sift/extension`. That folder contains TypeScript source files for development, so Chrome cannot load its background script directly.

## Use Selector Mode

Click **Select Elements** in the popup, hover a page element, then click it. Sift highlights the hovered element, shows a selector preview, counts matches, and sends the chosen selector through extension messaging. Press Escape to cancel.

## Extract Names

Choose **Names** in the popup or dashboard. By default, Sift removes emoji, variation selectors, zero-width characters, and repeated spaces while preserving accented letters, spaces, apostrophes, hyphens, periods, normal punctuation, and original capitalization.

## Extract Usernames

Choose **Usernames**. By default, Sift removes a leading `@`, lowercases the value, requires letters only, rejects numbers/spaces/symbols, applies the 8-12 character range, removes duplicates case-insensitively, and records rejection reasons.

Change **Invalid character handling** to remove invalid characters instead of rejecting an entire value.

## Extract Both

Choose **Both** when names and usernames should be preserved as related rows. The shared extractor supports paired card and table extraction so unrelated names and usernames are not paired across different parent items.

## Presets

Use **Save Preset** in the dashboard to store the active configuration locally. Presets are saved in SQLite on your computer.

## Export

Use dashboard export buttons to download CSV or JSON. The API also supports TXT, CSV, and JSON through `POST /api/export`.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run test
npm run build:extension
npm run start:server
npm run package:release
```

## Testing

Run all tests:

```bash
npm test
```

Run type checks:

```bash
npm run typecheck
```

## Local Data

Sift stores extraction sessions and presets in `server/database/sift.sqlite` by default. Change the path with `SIFT_DATABASE_PATH`.

## Common Errors

- **Dashboard offline:** Start the API with `npm run start:server`.
- **No active tab:** Open a normal `http` or `https` page before scanning.
- **Unsupported browser page:** Browser internal pages such as `chrome://extensions` cannot be scanned.
- **Invalid selector:** Reopen selector mode or simplify the CSS selector.
- **No selector matches:** The page layout may have changed or the selector may target hidden content.

## Known Limitations

- Auto-scroll and pagination controls are represented in the dashboard, but conservative active-page extraction is the default MVP path.
- Very large tables are supported through shared utilities, while dashboard rendering previews the first 25 rows for responsiveness.
- Selector mode chooses stable selectors heuristically and may need adjustment on sites with heavily generated class names.
