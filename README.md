# Sift

Sift is a local-first Chromium browser extension with a bundled dashboard for extracting usernames or names from text already visible in the active page DOM.

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

For normal use, no local server is required. Build and load the extension, then open the dashboard from the extension popup.

For dashboard UI development only:

```bash
npm run dev:dashboard
```

For optional API development:

```bash
npm run start:server
```

The bundled extension dashboard stores only the current temporary scans in browser session storage. The optional API still runs at `http://127.0.0.1:5174` for development experiments.

## Build

```bash
npm run build
```

Build only the extension:

```bash
npm run build:extension
```

The unpacked extension is generated at `dist/extension`, including the bundled dashboard at `dist/extension/dashboard/index.html`.

## Load The Extension

1. Run `npm run build:extension`.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable developer mode.
4. Choose **Load unpacked**.
5. Select `/Users/heisnberg/Documents/Sift/dist/extension`.
6. Click the Sift extension icon on a regular webpage.
7. Click **Open Dashboard** to open the bundled local dashboard.

Do not select `/Users/heisnberg/Documents/Sift/extension`. That folder contains TypeScript source files for development, so Chrome cannot load its background script directly.

## Use With SnapBoard

Open SnapBoard's **Username Generator** page and generate the count you want there. Click the Sift extension popup:

- **Get Data** scans all generated `.username-value` and `.display-value` entries on the page.

Open the bundled Sift dashboard to copy/export the current scan, edit the results text box, apply cleanup filters, or click **Get Data** to scan the open SnapBoard tab. Dashboard results are temporary; use **Clear** to empty them, or close the dashboard tab to clear the current scan view.

## Extract Names

Click **Get Data** in the popup or dashboard. By default, Sift removes zero-width characters and repeated spaces while preserving letters, numbers, emoji, hearts, symbols, punctuation, and original capitalization.

## Extract Usernames

Click **Get Data**. By default, Sift removes a leading `@`, keeps original casing, allows letters and numbers such as `debo1` and `Lil08`, rejects spaces/symbols, and uses a 1-15 character range. Enable **Lower case** in username settings to convert capital letters before copy/export.

## Presets

Cleanup settings are kept in the current dashboard view. No server is needed for normal use.

## Export

Use dashboard export buttons to download TXT or CSV. Formatting is handled locally in the browser.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run test
npm run build:extension
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

Sift stores current extraction results in temporary browser session storage by default. Closing the dashboard tab or clicking **Clear** removes those temporary results. The optional development API stores data in `server/database/sift.sqlite` when you run `npm run start:server`.

## Common Errors

- **127.0.0.1 refused to connect:** You opened the old development URL. Load the extension from `/Users/heisnberg/Documents/Sift/dist/extension`, then click **Open Dashboard** in the popup.
- **No active tab:** Open a normal `http` or `https` page before scanning.
- **Unsupported browser page:** Browser internal pages such as `chrome://extensions` cannot be scanned.
- **Empty dashboard:** Generate usernames on SnapBoard first, then click **Get Data** in the Sift popup or dashboard.

## Known Limitations

- Sift scans the generated values currently present in the SnapBoard page DOM.
- If SnapBoard changes `.username-value` or `.display-value`, the SnapBoard-specific scanner will need an update.
