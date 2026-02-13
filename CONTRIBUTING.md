# Contributing to ctscrape

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/)
- Google Chrome

### Getting Started

```bash
git clone https://github.com/robinmount/ctscrape.git
cd ctscrape
pnpm install
pnpm dev
```

`pnpm dev` starts the WXT dev server with HMR and opens Chrome with the extension loaded.

### Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server with HMR |
| `pnpm build` | Production build for Chrome |
| `pnpm zip` | Create ZIP for Chrome Web Store |
| `pnpm check` | TypeScript type-check |
| `pnpm test` | Vitest in watch mode |
| `pnpm test:run` | Vitest single run |
| `pnpm test:coverage` | Vitest with coverage |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier (write) |
| `pnpm format:check` | Prettier (check only) |

## Code Standards

- **TypeScript strict mode** -- no `any` unless absolutely necessary.
- **Svelte 5 runes** -- use `$state`, `$derived`, `$effect` instead of Svelte 4 stores.
- **ESLint** and **Prettier** for linting and formatting. Run `pnpm lint` and `pnpm format:check` before committing.
- No `eval()` or dynamic code execution (CSP violation in MV3).
- No manual edits to generated files (`.output/`, `.wxt/`, `node_modules/`).

## Adding a New Adapter

This is the most common contribution. Each supported credit report site gets its own adapter. The CheckMyFile adapter serves as the reference implementation.

### Step 1: Create the Adapter Directory

```
src/adapters/{site-name}/
  index.ts
  detector.ts
  extractor.ts
  constants.ts
```

Replace `{site-name}` with a lowercase, hyphenated identifier (e.g. `experian-uk`).

### Step 2: Define Constants

Create `constants.ts` with CSS selectors, field mappings, and CRA names specific to the site.

```typescript
// src/adapters/experian-uk/constants.ts

export const SELECTORS = {
  REPORT_CONTAINER: 'report-container',
  // ... site-specific selectors
} as const;

export const CRA_NAMES = ['Experian'] as const;
```

### Step 3: Implement the Detector

Create `detector.ts` with `detect()` and `getPageInfo()` functions.

```typescript
// src/adapters/experian-uk/detector.ts
import type { PageInfo } from '../types';

/** Check if the current page is a scrapeable report page. */
export function detect(document: Document): boolean {
  // Check URL, DOM structure, and key elements
  // Return true only if confident this is a report page
  return false;
}

/** Extract basic page info before full extraction. */
export function getPageInfo(document: Document): PageInfo {
  return {
    siteName: 'Experian UK',
    providers: ['Experian'],
    // Optionally: subjectName, reportDate
  };
}
```

`detect()` should be fast and non-destructive. It runs on every matching page load. Only return `true` when confident the page contains extractable report data.

### Step 4: Implement the Extractor

Create `extractor.ts` that performs full DOM extraction.

```typescript
// src/adapters/experian-uk/extractor.ts
import type { RawExtractedData, RawSection } from '../types';

export async function extract(
  doc: Document,
  adapterId: string,
  adapterVersion: string,
): Promise<RawExtractedData> {
  const sections: RawSection[] = [];

  // Extract each domain's data into RawSection objects
  // Each field is a RawField with: name, value, confidence, optional groupKey

  return {
    metadata: {
      adapterId,
      adapterVersion,
      extractedAt: new Date().toISOString(),
      pageUrl: doc.location?.href ?? '',
      htmlHash: '', // Set by content script
      sourceSystemsFound: ['Experian'],
    },
    sections,
  };
}
```

**Key rules for extraction:**
- Extract raw values exactly as they appear on the page. Do not normalise during extraction.
- Set `confidence` to `'high'`, `'medium'`, or `'low'` based on how reliably the extractor found the value.
- Use `groupKey` to associate fields that belong to the same entity (e.g. fields of the same tradeline).
- For multi-CRA sites, set `sourceSystem` on each `RawSection` to the CRA name.

### Step 5: Register the Adapter

Create `index.ts` that defines and registers the `SiteAdapter`:

```typescript
// src/adapters/experian-uk/index.ts
import { registerAdapter } from '../registry';
import type { SiteAdapter, DataDomain } from '../types';
import { detect, getPageInfo } from './detector';
import { extract } from './extractor';

const experianUkAdapter: SiteAdapter = {
  id: 'experian-uk',
  name: 'Experian UK',
  version: '0.1.0',
  matchPatterns: ['*://*.experian.co.uk/*'],

  detect(document: Document): boolean {
    return detect(document);
  },

  getPageInfo(document: Document) {
    return getPageInfo(document);
  },

  async extract(document: Document) {
    return extract(document, this.id, this.version);
  },

  getSupportedSections(): DataDomain[] {
    return ['personal_info', 'addresses', 'tradelines', 'searches', 'credit_scores'];
  },
};

registerAdapter(experianUkAdapter);
export default experianUkAdapter;
```

### Step 6: Import in the Content Script

Add the adapter import to `src/entrypoints/content.ts`:

```typescript
import '@/adapters/checkmyfile';
import '@/adapters/experian-uk';  // Add this line
```

### Step 7: Add the Host Permission

Add the site's match pattern to `wxt.config.ts`:

```typescript
manifest: {
  host_permissions: [
    '*://*.checkmyfile.com/*',
    '*://*.experian.co.uk/*',  // Add this line
  ],
},
```

And update the content script's `matches` array in `src/entrypoints/content.ts`:

```typescript
export default defineContentScript({
  matches: [
    '*://*.checkmyfile.com/*',
    '*://*.experian.co.uk/*',  // Add this line
  ],
  // ...
});
```

### Step 8: Write Tests

Create `src/adapters/{site-name}/__tests__/` with tests for the detector, extractor, and individual section extractors. See `src/adapters/checkmyfile/__tests__/` for examples.

At minimum, test:
- `detect()` returns `true` for valid report pages and `false` for other pages
- `getPageInfo()` extracts correct subject name and report date
- Section extractors produce correct `RawField` values for sample HTML

## Data Conventions

These conventions apply to the normalisation layer, but adapter authors should be aware of them to ensure raw values can be correctly normalised.

| Data Type | Convention | Example |
|-----------|-----------|---------|
| Monetary values | Integer minor units (pence) | `"£1,234.56"` -> `123456` |
| Dates | ISO 8601 | `"15 January 2024"` -> `"2024-01-15"` |
| Periods | `YYYY-MM` | `"January 2024"` -> `"2024-01"` |
| Enums | Must match ctspec exactly | See `ctspec/schemas/credittimeline-v1-enums.json` |
| `acquisition_method` | Always `"html_scrape"` | |
| `source_wrapper` | Site name | `"CheckMyFile"`, `"Experian UK"` |

## RawField Structure

Every extracted value is wrapped in a `RawField`:

```typescript
interface RawField {
  name: string;        // Field identifier (e.g. "account_type", "balance")
  value: string;       // Raw value as it appears on the page
  groupKey?: string;   // Groups related fields (e.g. same tradeline)
  confidence: 'high' | 'medium' | 'low';
}
```

- **`name`**: Use snake_case identifiers that map to ctspec field names where possible.
- **`value`**: Always a string, exactly as it appears on the page. Normalisation happens later.
- **`groupKey`**: Required when multiple fields belong to the same entity. Use a stable, unique key (e.g. a combination of CRA name and account identifier).
- **`confidence`**: Reflects how reliably the field was extracted. `high` for well-structured data with clear selectors; `medium` for heuristic extraction; `low` for best-effort guesses.

## Testing

### Unit Tests

```bash
pnpm test:run                    # Run all tests
pnpm test:run -- --grep adapter  # Run tests matching "adapter"
```

Tests use Vitest with happy-dom for DOM simulation. The `@webext-core/fake-browser` package provides a mock browser API.

### Coverage

```bash
pnpm test:coverage
```

### E2E Tests

```bash
pnpm test:e2e
```

E2E tests use Puppeteer to test the built extension in a real Chrome instance.

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

```
type(scope): description

feat(adapter): add Experian UK adapter
fix(normalizer): handle missing report date
docs: update README with new adapter
test(checkmyfile): add payment history extraction tests
chore: update dependencies
```

Common types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `perf`.

## Reporting Issues

Open an issue on [GitHub Issues](https://github.com/robinmount/ctscrape/issues) with:

- Extension version (from `chrome://extensions/`)
- Chrome version
- Steps to reproduce
- Expected vs actual behaviour
- Console errors (from the service worker and content script inspectors)
