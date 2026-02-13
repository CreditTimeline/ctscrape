# User Guide

## What is ctscrape?

ctscrape is a Chrome browser extension that reads credit report data from supported provider websites and sends it to your personal ctview server. This lets you track your credit data over time, compare reports from different dates, and analyse trends -- all in your own self-hosted instance.

The extension does not send your data to any third party. It only communicates with the ctview server that you configure.

## Installation

### Chrome Web Store

<!-- TODO: Add Chrome Web Store link once published -->
Coming soon.

### Developer Mode (Sideload)

If you want to install from source:

1. Download or clone the [ctscrape repository](https://github.com/robinmount/ctscrape)
2. Install dependencies and build:
   ```bash
   pnpm install
   pnpm build
   ```
3. Open Chrome and go to `chrome://extensions/`
4. Turn on **Developer mode** (toggle in the top-right corner)
5. Click **Load unpacked**
6. Select the `.output/chrome-mv3` folder from the project
7. Pin the extension icon in the Chrome toolbar for easy access

## Initial Setup

Before you can send data, you need to connect ctscrape to your ctview server.

1. Click the ctscrape icon in the toolbar, then click **Open side panel** (or right-click the icon and choose "Open side panel")
2. In the side panel, go to **Connection Settings**
3. Enter your ctview server URL (e.g. `https://ctview.example.com`)
4. Enter your API key
5. Click **Test Connection** to verify the connection works
6. If the test succeeds, you are ready to scrape

## Scraping a Credit Report

### Step 1: Navigate to a Supported Site

Go to one of the supported credit report sites and open your report. Currently supported:

| Site | URL | Report Page |
|------|-----|-------------|
| CheckMyFile | checkmyfile.com | The downloadable report page (`/download`) |

### Step 2: Extension Detects the Page

When you land on a supported report page, the extension automatically detects it. The badge on the extension icon changes to indicate detection:

- **Blue "!"** -- Report page detected, ready to extract

### Step 3: Extract Data

Open the side panel and click **Extract**. The extension reads the report data from the page:

- **Yellow "..."** -- Extraction or normalisation in progress
- **Green "OK"** -- Data extracted and validated successfully
- **Red "ERR"** -- Something went wrong (see the side panel for details)

The side panel shows a summary of what was found: number of addresses, tradelines, credit scores, searches, and other entities.

### Step 4: Review and Send

Review the extraction summary in the side panel. When you are satisfied:

1. Click **Send to ctview**
2. The extension sends the normalised data to your ctview server
3. On success, you receive a receipt ID confirming the import

## Badge Colours

The extension icon badge provides quick status at a glance:

| Badge | Colour | Meaning |
|-------|--------|---------|
| (none) | -- | No report page detected |
| **!** | Blue | Report page detected |
| **...** | Yellow | Extracting, normalising, or sending |
| **OK** | Green | Data ready or send complete |
| **ERR** | Red | Error occurred |

## History

The **History** section in the side panel shows your recent extractions (up to 50 entries). Each entry shows:

- Site name and extraction date
- Number of entities extracted
- Send status: pending, sent, or failed
- Receipt ID (if sent successfully)

For failed sends, you can click **Retry** to attempt sending again. The extension also automatically retries failed sends in the background with increasing delays.

## Troubleshooting

### "No report page detected"

- Make sure you are on the correct page. For CheckMyFile, navigate to the `/download` page (the downloadable report view).
- The page needs to be fully loaded. Wait for the page to finish loading before expecting detection.
- Refresh the page and wait a few seconds.

### "Could not connect to server"

- Check that your ctview server URL is correct in Connection Settings.
- Verify the server is running and accessible from your network.
- If you see a CORS error, the ctview server may need `CORS_ALLOW_ORIGIN` configured to allow requests from the extension.

### "Authentication failed"

- Check that your API key is correct in Connection Settings.
- The API key may have expired -- generate a new one in ctview.

### "Validation failed"

- The extracted data did not pass validation. This may indicate a change in the report page layout that the adapter does not handle.
- Check for any warnings in the extraction results.
- Report the issue on [GitHub](https://github.com/robinmount/ctscrape/issues) with the site name and any error details shown.

### Extension badge is stuck on yellow

- The extraction or normalisation may be taking longer than expected for a large report.
- If it stays yellow for more than 30 seconds, try refreshing the page and extracting again.

### Failed sends not retrying

- The retry queue processes every minute. Wait at least a minute for automatic retry.
- After 5 failed attempts, the retry is abandoned. Use the manual **Retry** button in History.
- Check that your ctview server is running and the connection settings are correct.

## Privacy and Security

### What data does ctscrape access?

The extension only activates on pages matching supported site URL patterns (e.g. `*.checkmyfile.com`). On those pages, it reads the DOM to extract credit report data that is already visible to you in the browser.

### Where does my data go?

Your data is sent **only** to the ctview server URL that you configure. No data is sent to any other server, third party, or analytics service.

### What is stored locally?

- **Connection settings** (server URL and API key): Stored in Chrome's sync storage. If you use Chrome sync, these settings follow your Google account. The API key is stored as-is in Chrome's storage (not in localStorage or cookies).
- **Scrape history**: Stored in Chrome's local storage on this device only. Contains metadata about past extractions (site, date, entity counts, send status) but not the full extracted data.
- **Retry queue**: Stored in Chrome's local storage. Contains normalised data for failed sends awaiting retry. Cleared once successfully sent or after max retries.

### Telemetry

ctscrape does not collect any usage analytics, crash reports, or telemetry of any kind.
