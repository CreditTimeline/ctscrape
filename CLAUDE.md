# CLAUDE.md

## Scope

Applies to `/` and all descendants.

## Repo Overview

- Browser extension built with WXT (wxt.dev) and Svelte 5.
- Scrapes credit report data from provider websites (starting with CheckMyFile).
- Normalises extracted data to the ctspec CreditTimeline JSON schema.
- Sends normalised data to a ctview instance via @ctview/sdk.

## Related Repositories

- `ctspec` — Canonical data model (JSON Schema, SQL DDL, enum definitions, mapping crosswalks).
- `ctview` — SvelteKit app for storing, querying, and analysing credit timeline data.

## Commands

```bash
pnpm install
pnpm dev              # WXT dev server with HMR, opens Chrome with extension loaded
pnpm build            # Production build for Chrome
pnpm zip              # Create ZIP for Chrome Web Store submission
pnpm check            # TypeScript type-check
pnpm test             # Vitest in watch mode
pnpm test:run         # Vitest single run
pnpm lint             # ESLint
pnpm format           # Prettier
```

## Project Structure

```
src/
  entrypoints/          # WXT entrypoints (auto-generates manifest)
    background.ts       # Service worker — orchestration, API calls, normalisation
    popup/              # Popup UI (quick actions)
    content.ts          # Content script — page detection and DOM extraction
  adapters/             # Site-specific scraping adapters
    types.ts            # SiteAdapter interface, RawExtractedData types
  normalizer/           # Raw extracted data → ctspec CreditFile
    types.ts            # NormalisationResult, NormalisationError types
  utils/
    messaging.ts        # @webext-core/messaging typed protocol
    storage.ts          # wxt/storage typed items
  types/
    index.ts            # Shared types, re-exports
public/
  icon/                 # Extension icons (16, 32, 48, 128 PNG)
```

## Key Conventions

- All content scripts focus purely on DOM extraction — no normalisation or API calls.
- Service worker handles orchestration: normalise, validate, send to ctview.
- Message passing between contexts uses @webext-core/messaging with a typed ProtocolMap.
- Storage access uses WXT's typed storage wrappers (wxt/storage).
- All monetary values are integer minor units (pence). Parse "£1,234.56" → 123456.
- All dates normalise to ISO 8601 (YYYY-MM-DD). Periods to YYYY-MM.
- Enum values must match ctspec exactly — see ctspec/schemas/credittimeline-v1-enums.json.
- acquisition_method is always "html_scrape" for extension-produced data.
- source_wrapper is the site name (e.g., "CheckMyFile").

## Adapter Pattern

Each target site gets an adapter in `src/adapters/{site-name}/`. Adapters implement
the `SiteAdapter` interface and are registered in the adapter registry. To add a
new site, create a new adapter — no changes to core extension code needed.

## Global Guardrails

- Keep TypeScript strict-safe.
- Do not manually edit generated/build artifacts (.output/, .wxt/, node_modules/).
- Do not introduce eval() or dynamic code execution (CSP violation in MV3).
- Validate extracted data against ctspec schema before sending to ctview.
- Never send data without user confirmation.
- Store API keys in chrome.storage.sync, never in localStorage or hardcoded.

## Definition of Done

- Changes are minimal, coherent, and scoped to the task.
- Relevant tests have been run for touched areas.
- Extension builds cleanly with `pnpm build`.
- Type-check passes with `pnpm check`.
