# Google Analytics 4 Setup

ctscrape uses the GA4 Measurement Protocol to track anonymous usage analytics. This requires a GA4 property and API credentials.

## 1. Create a GA4 Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Admin** (gear icon)
3. Click **Create Property**
4. Name it `ctscrape` (or similar)
5. Set your timezone and currency

## 2. Create a Web Data Stream

1. In Admin > **Data Streams**, click **Add stream** > **Web**
2. Enter your Chrome Web Store listing URL (or `https://credittimeline.uk`)
3. Name the stream `ctscrape extension`
4. Note the **Measurement ID** (format: `G-XXXXXXXXXX`)

## 3. Create a Measurement Protocol API Secret

1. In Admin > Data Streams, click your stream
2. Scroll down and click **Measurement Protocol API secrets**
3. Click **Create**
4. Give it a name (e.g. `ctscrape-extension`)
5. Copy the **Secret value** — you'll need this for the build config

## 4. Configure Build Environment

### Local Development

Create a `.env.local` file in the project root (already gitignored):

```env
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_API_SECRET=your-api-secret-here
```

In dev mode, events are sent to GA4's `/debug/mp/collect` endpoint which validates payloads and returns errors but does not record data to your property. Check the browser DevTools network tab for validation responses.

### CI / Production Build

Add the following secrets to your GitHub repository (Settings > Secrets and variables > Actions):

| Secret | Value |
|--------|-------|
| `GA4_MEASUREMENT_ID` | Your Measurement ID (e.g. `G-XXXXXXXXXX`) |
| `GA4_API_SECRET` | The API secret from step 3 |

These are injected at build time via `wxt.config.ts` and compiled into the extension bundle.

## 5. Configure Custom Dimensions (Optional)

To get the most out of extension-specific event parameters, create custom dimensions in GA4:

1. Go to Admin > **Custom definitions**
2. Click **Create custom dimension** for each:

| Dimension name | Event parameter | Scope |
|---------------|----------------|-------|
| Adapter ID | `adapter_id` | Event |
| Site Name | `site_name` | Event |
| Error Code | `error_code` | Event |
| Extension Version | `extension_version` | User |

## 6. Verify Events

1. Build and load the extension with GA4 credentials set
2. Enable analytics consent in Settings > Privacy & Analytics
3. Open GA4 > **Realtime** report
4. Perform actions in the extension (visit a supported page, extract, send)
5. Events should appear in realtime within seconds

## Events Tracked

| Event | When | Key Params |
|-------|------|------------|
| `extension_installed` | First install | - |
| `extension_updated` | Extension update | `previous_version` |
| `page_detected` | Supported page found | `site_name` |
| `extraction_started` | User triggers extract | `adapter_id` |
| `extraction_completed` | Extraction finishes | `adapter_id`, `entity_count` |
| `extraction_error` | Extraction fails | `adapter_id`, `error_message` |
| `normalisation_completed` | Normalisation finishes | `success`, `error_count` |
| `send_started` | User initiates send | - |
| `send_completed` | Send succeeds | `duplicate` |
| `send_error` | Send fails | `error_code` |
| `connection_tested` | User tests connection | `success` |
| `retry_attempted` | Manual retry | `success` |
| `settings_changed` | Settings updated | `field` |
| `support_bundle_created` | Support bundle exported | - |

## Privacy

- All tracking is gated behind explicit user consent (opt-in)
- No personal or financial data is ever sent to GA4
- Client ID is a random identifier stored locally — not linked to any user account
- Session ID is ephemeral (cleared when browser closes)
- The Measurement Protocol does not set cookies
