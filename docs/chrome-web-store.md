# Chrome Web Store Listing

Materials and guide for publishing ctscrape to the Chrome Web Store.

## Store Listing Text

### Short Description (max 132 characters)

```
Scrape credit report data from provider websites and send it to your self-hosted ctview instance for analysis.
```

### Full Description

```
ctscrape extracts credit report data from supported provider websites and sends it to your self-hosted ctview server for long-term storage and analysis.

FEATURES
- Automatically detects supported credit report pages
- Extracts structured data from multi-CRA report pages
- Normalises data to a standard schema (ctspec CreditTimeline)
- Validates all data before sending
- Sends to your own ctview server — your data never leaves your control
- Automatic retry for failed sends with exponential backoff
- Side panel UI for configuration, data review, and send confirmation
- Full extraction history with per-entity counts

SUPPORTED SITES
- CheckMyFile (Equifax, Experian, TransUnion, Crediva)

HOW IT WORKS
1. Navigate to a supported credit report page
2. The extension detects the report page (badge turns blue)
3. Click Extract in the side panel to read the data
4. Review the extraction summary
5. Click Send to send the data to your ctview server

REQUIREMENTS
- A running ctview server instance (self-hosted)
- An API key for your ctview server

PRIVACY
- Your credit report data is sent ONLY to the ctview server you configure
- No data is sent to any third party
- No analytics or telemetry
- Connection settings sync via Chrome Sync; scrape history is stored locally only

OPEN SOURCE
ctscrape is free and open source software, licensed under GPL-3.0.
Source code: https://github.com/robinmount/ctscrape
```

### Category

**Productivity**

## Privacy Policy

The following privacy policy text is suitable for hosting at a URL referenced in the Chrome Web Store listing.

---

**ctscrape Privacy Policy**

Last updated: 2025-01-01

**What data does ctscrape access?**

ctscrape is a browser extension that reads credit report data from supported provider websites. The extension only activates on pages matching specific URL patterns for supported sites (currently `*.checkmyfile.com`). On those pages, the extension reads the page content (DOM) to extract credit report data that is already visible to you in your browser.

**Where is data sent?**

Extracted data is sent exclusively to the ctview server URL that you configure in the extension's settings. No data is sent to any other server, service, or third party. The extension developers do not receive, process, or have access to your credit report data.

**What is stored locally?**

The extension stores the following data in Chrome's built-in storage:

- *Connection settings* (server URL and API key): Stored in Chrome sync storage. If you use Chrome Sync, these settings are synced across your devices via your Google account.
- *Scrape history*: Stored in Chrome local storage (this device only). Contains metadata about past extractions — site name, extraction date, entity counts, and send status. Does not contain the full extracted credit report data.
- *Retry queue*: Stored in Chrome local storage (this device only). Contains normalised data for failed sends awaiting retry. Items are removed after successful send or after the maximum number of retry attempts.
- *Temporary state*: Stored in Chrome session storage. Cleared when the browser is closed.

No data is stored in localStorage, cookies, or IndexedDB.

**Analytics and telemetry**

ctscrape does not collect any usage analytics, crash reports, telemetry, or tracking data of any kind. The extension makes no network requests except to the ctview server URL that you configure.

**Third-party services**

ctscrape does not use any third-party services, SDKs, or APIs beyond Chrome's built-in extension APIs.

**Data security**

API keys are stored in Chrome's sync storage, which is encrypted by Chrome. The extension communicates with your ctview server over HTTPS (when configured with an HTTPS URL). The extension does not transmit your API key to any party other than your configured ctview server.

**Changes to this policy**

Changes to this privacy policy will be posted in the extension's GitHub repository.

**Contact**

For questions about this privacy policy, open an issue at: https://github.com/robinmount/ctscrape/issues

---

## Permission Justifications

These justifications are required when submitting to the Chrome Web Store.

| Permission | Justification |
|-----------|---------------|
| `storage` | Store user connection settings (server URL, API key) in sync storage and scrape history/retry queue in local storage. Required for the extension to persist configuration and track extraction history. |
| `activeTab` | Interact with the active tab on user action to detect credit report pages and extract data. Only accessed when the user actively engages with the extension. |
| `sidePanel` | Display the primary extension UI as a side panel for connection configuration, extraction results review, send confirmation, and scrape history. |
| `alarms` | Schedule automatic retry processing for failed data sends. A single alarm fires every 1 minute to check the retry queue. |
| `*://*.checkmyfile.com/*` (host) | Run the content script on CheckMyFile pages to detect credit report pages and extract data from the DOM when the user requests extraction. |
| `*://*/*` (optional host) | Requested at runtime to support future adapters for additional credit report sites without requiring an extension update. Not used until the user enables a new adapter. |

## Asset Requirements

### Required Assets

| Asset | Dimensions | Format | Notes |
|-------|-----------|--------|-------|
| Extension icon | 128x128 | PNG | Already exists at `public/icon/icon-128.png` |
| Screenshot 1 | 1280x800 or 640x400 | PNG/JPEG | Side panel showing Connection Settings with a successful test |
| Screenshot 2 | 1280x800 or 640x400 | PNG/JPEG | Side panel showing extraction results with entity summary |
| Screenshot 3 | 1280x800 or 640x400 | PNG/JPEG | Side panel showing send confirmation with receipt |
| Screenshot 4 | 1280x800 or 640x400 | PNG/JPEG | History section showing past extractions |

### Optional Assets

| Asset | Dimensions | Format | Notes |
|-------|-----------|--------|-------|
| Small promotional tile | 440x280 | PNG/JPEG | Featured in search results. Show the extension icon, name, and tagline. |
| Large promotional tile | 920x680 | PNG/JPEG | Featured in banner placements. Show the side panel UI with a brief feature callout. |

### Screenshot Suggestions

1. **Connection Settings**: Show the side panel with a ctview URL entered and a green "Connected" status after a successful test.
2. **Extraction Results**: Navigate to a CheckMyFile report page, extract data, and capture the side panel showing the entity summary (e.g. "12 tradelines, 5 addresses, 3 credit scores").
3. **Send Confirmation**: After sending, capture the success state with receipt ID displayed.
4. **History**: Capture the History section with a few entries showing mixed statuses (sent, pending).

## Publishing Guide

### 1. Register as a Chrome Web Store Developer

- Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- Sign in with a Google account
- Pay the one-time $5 registration fee

### 2. Build and Package

```bash
pnpm install
pnpm build
pnpm zip
```

The ZIP file is created at `.output/ctscrape-<version>-chrome.zip`.

### 3. Create a New Item

- In the Developer Dashboard, click **New Item**
- Upload the ZIP file

### 4. Fill In the Store Listing

- **Language**: English
- **Name**: ctscrape -- Credit Report Scraper
- **Short description**: Use the text from the [Short Description](#short-description-max-132-characters) section above
- **Description**: Use the text from the [Full Description](#full-description) section above
- **Category**: Productivity
- **Icon**: Upload `public/icon/icon-128.png`
- **Screenshots**: Upload screenshots per the [Asset Requirements](#asset-requirements) section

### 5. Privacy Tab

- **Single purpose description**: "Extract credit report data from supported provider websites and send it to a user-configured ctview server."
- **Permission justifications**: Use the table from the [Permission Justifications](#permission-justifications) section
- **Privacy policy URL**: Link to your hosted privacy policy (use the text from the [Privacy Policy](#privacy-policy) section)
- **Data usage**: Does NOT sell or transfer data to third parties. Does NOT use or transfer data for unrelated purposes.
- **Certify data use practices**

### 6. Distribution Tab

- **Visibility**: Public
- **Distribution regions**: All regions (or select specific regions)
- **Pricing**: Free

### 7. Submit for Review

Click **Submit for review**. Initial review typically takes 1-3 business days. Common reasons for rejection:
- Missing or inadequate permission justifications
- Privacy policy does not cover all data practices
- Screenshots do not accurately represent the extension

### 8. Post-Approval Setup

After the extension is approved and published:

1. Note the extension's Chrome Web Store ID from the dashboard URL
2. For automated publishing, set up API credentials:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create or select a project
   - Enable the Chrome Web Store API
   - Create OAuth 2.0 credentials (client ID and secret)
   - Generate a refresh token using the Chrome Web Store publish scope

### 9. Configure GitHub Secrets for CI/CD

Add the following secrets to the GitHub repository for automated publishing:

| Secret | Value |
|--------|-------|
| `CWS_CLIENT_ID` | OAuth 2.0 client ID from Google Cloud Console |
| `CWS_CLIENT_SECRET` | OAuth 2.0 client secret |
| `CWS_REFRESH_TOKEN` | Refresh token for the Chrome Web Store API |
| `CWS_EXTENSION_ID` | Chrome Web Store extension ID |

The CI/CD pipeline can then use these secrets with `wxt submit` or the Chrome Web Store API to publish new versions automatically on tagged releases.

### 10. Update README

After publishing, update the README.md to replace the "Coming soon" placeholder with the actual Chrome Web Store link:

```markdown
### Chrome Web Store

[Install ctscrape](https://chrome.google.com/webstore/detail/{extension-id})
```
