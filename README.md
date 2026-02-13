# ctscrape

Browser extension that scrapes credit report data from provider websites, normalises it to the [ctspec](https://github.com/robinmount/ctspec) CreditTimeline JSON schema, and sends it to a self-hosted [ctview](https://github.com/robinmount/ctview) instance for storage and analysis.

## Features

- Detects supported credit report pages automatically
- Extracts structured data from multi-CRA report pages via DOM scraping
- Normalises raw extracted data to the ctspec CreditTimeline schema
- Validates data against ctspec before sending
- Sends normalised data to your ctview instance via API
- Automatic retry with exponential backoff for failed sends
- Full provenance tracking (HTML hashes, extraction timestamps, adapter versions)
- Side panel UI for configuration, data review, and send confirmation
- Scrape history with per-entity counts

## Supported Sites

| Site | Provider(s) | Status |
|------|------------|--------|
| [CheckMyFile](https://www.checkmyfile.com) | Equifax, Experian, TransUnion, Crediva | Active |

## Related Projects

| Project | Description |
|---------|-------------|
| [ctspec](https://github.com/robinmount/ctspec) | Canonical data model -- JSON Schema, SQL DDL, enum definitions, mapping crosswalks |
| [ctview](https://github.com/robinmount/ctview) | SvelteKit app for storing, querying, and analysing credit timeline data |

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/)
- Google Chrome (or Chromium-based browser)

## Quick Start

```bash
git clone https://github.com/robinmount/ctscrape.git
cd ctscrape
pnpm install
pnpm dev          # Opens Chrome with the extension loaded and HMR enabled
```

### Build and Test

```bash
pnpm build        # Production build for Chrome
pnpm zip          # Create ZIP for Chrome Web Store submission
pnpm check        # TypeScript type-check
pnpm test:run     # Run tests once
pnpm test         # Run tests in watch mode
pnpm lint         # ESLint
pnpm format       # Prettier
```

## Installation

### Chrome Web Store

<!-- TODO: Add Chrome Web Store link once published -->
Coming soon.

### Developer Mode (Sideload)

1. Clone the repository and build:
   ```bash
   git clone https://github.com/robinmount/ctscrape.git
   cd ctscrape
   pnpm install
   pnpm build
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `.output/chrome-mv3` directory from the project root
6. The extension icon appears in the toolbar -- pin it for easy access

## Project Structure

```
src/
  adapters/              Site-specific scraping adapters
    types.ts             SiteAdapter interface, RawExtractedData types
    registry.ts          Adapter registry and URL matching
    checkmyfile/         CheckMyFile adapter implementation
  normalizer/            Raw extracted data -> ctspec CreditFile
    engine.ts            Main normalise() entry point
    stages/              Per-domain normalisation stages
    validation/          Schema and referential integrity validators
    types.ts             NormalisationResult, NormalisationError types
  extraction/            Extraction state machine
    orchestrator.ts      Per-tab job management
    types.ts             ExtractionState, ExtractionJob types
  entrypoints/           WXT entrypoints (auto-generates manifest)
    background.ts        Service worker -- orchestration, API calls
    content.ts           Content script -- page detection, DOM extraction
    popup/               Popup UI (quick actions)
    sidepanel/           Side panel UI (primary interface)
  components/            Shared Svelte components
  lib/                   Utility modules (client, retry queue, badge, etc.)
  utils/
    messaging.ts         @webext-core/messaging typed protocol
    storage.ts           wxt/storage typed items
  types/                 Shared type definitions
public/
  icon/                  Extension icons (16, 32, 48, 128 PNG)
```

## Architecture

ctscrape is a Manifest V3 Chrome extension built with [WXT](https://wxt.dev) and [Svelte 5](https://svelte.dev). The content script detects supported pages and extracts raw data from the DOM. The service worker orchestrates the pipeline: normalisation, validation, and sending to ctview. The side panel provides the primary user interface.

The extension uses an adapter pattern for multi-site support -- each target site gets its own adapter that implements the `SiteAdapter` interface. Adding a new site requires only creating a new adapter; no changes to core extension code are needed.

See [docs/architecture.md](docs/architecture.md) for the full architecture document.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code standards, and a step-by-step guide to adding new site adapters.

## License

[GPL-3.0-or-later](LICENSE)
