<script lang="ts">
  import { sendMessage, type ExtensionStatus, type SendResult } from '../../utils/messaging';
  import {
    connectionSettings,
    userPreferences,
    scrapeHistory,
    type ConnectionSettings,
    type UserPreferences,
    type ScrapeHistoryEntry,
  } from '../../utils/storage';
  import { createStatusPoller } from '../../lib/status-poller.svelte';
  import { initTheme, setTheme } from '../../lib/theme.svelte';
  import { addToast } from '../../lib/toast-store.svelte';
  import ToastContainer from '../../components/ToastContainer.svelte';
  import { initFaro, teardownFaro } from '../../lib/telemetry/faro-init';

  import ConnectionSettingsSection from './sections/ConnectionSettings.svelte';
  import CurrentPage from './sections/CurrentPage.svelte';
  import ExtractionResults from './sections/ExtractionResults.svelte';
  import SendToCtview from './sections/SendToCtview.svelte';
  import History from './sections/History.svelte';
  import Settings from './sections/Settings.svelte';
  import DiagnosticLog from './sections/DiagnosticLog.svelte';

  const poller = createStatusPoller();

  let connSettings = $state<ConnectionSettings>({ serverUrl: '', apiKey: '' });
  let prefs = $state<UserPreferences>({ defaultSubjectId: '', autoExtract: false, theme: 'system', debugLogging: false, analyticsConsent: false });
  let history = $state<ScrapeHistoryEntry[]>([]);
  let lastSendResult = $state<SendResult | null>(null);

  // Start/stop status polling
  $effect(() => {
    poller.start();
    return () => poller.stop();
  });

  // Initialise theme
  $effect(() => {
    initTheme();
  });

  // Initialise Faro telemetry (consent-gated)
  $effect(() => {
    if (prefs.analyticsConsent) {
      initFaro().catch(() => {});
    } else {
      teardownFaro();
    }
  });

  // Poll storage for settings/preferences/history
  $effect(() => {
    connectionSettings.getValue().then((v) => (connSettings = v));
    userPreferences.getValue().then((v) => (prefs = v));
    scrapeHistory.getValue().then((v) => (history = v));

    const timer = setInterval(() => {
      connectionSettings.getValue().then((v) => (connSettings = v));
      userPreferences.getValue().then((v) => (prefs = v));
      scrapeHistory.getValue().then((v) => (history = v));
    }, 2000);

    return () => clearInterval(timer);
  });

  // Clear send result when extraction state resets
  $effect(() => {
    if (poller.status.state === 'idle' || poller.status.state === 'detected') {
      lastSendResult = null;
    }
  });

  async function handleSaveConnection(settings: ConnectionSettings) {
    await connectionSettings.setValue(settings);
    connSettings = settings;
    addToast('Connection settings saved.', 'success');
  }

  async function handleExtract() {
    try {
      await sendMessage('triggerExtract', undefined);
    } catch (e) {
      addToast('Extraction failed: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error');
    }
  }

  async function handleSend() {
    try {
      lastSendResult = null;
      const result = await sendMessage('sendToCtview', undefined);
      lastSendResult = result;
      if (!result.success) {
        addToast(result.error ?? 'Send failed', 'error');
      }
    } catch (e) {
      addToast('Send failed: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error');
    }
  }

  async function handleResend(entry: ScrapeHistoryEntry) {
    try {
      const result = await sendMessage('manualRetry', { historyId: entry.id });
      if (result.success) {
        addToast('Retry initiated.', 'info');
      } else {
        addToast('Retry failed: ' + (result.error ?? 'Unknown error'), 'error');
      }
    } catch (e) {
      addToast('Resend failed: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error');
    }
  }

  async function handleClearHistory() {
    await scrapeHistory.setValue([]);
    history = [];
    addToast('History cleared.', 'success');
  }

  async function handleSavePreferences(newPrefs: UserPreferences) {
    await userPreferences.setValue(newPrefs);
    prefs = newPrefs;
    await setTheme(newPrefs.theme);
    addToast('Preferences saved.', 'success');
  }
</script>

<main class="sidepanel">
  <header class="header">
    <h1 class="title">ctscrape</h1>
  </header>

  <div class="sections">
    <ConnectionSettingsSection settings={connSettings} onsave={handleSaveConnection} />

    <hr class="divider" />

    <CurrentPage
      state={poller.status.state}
      pageInfo={poller.status.pageInfo}
      onextract={handleExtract}
    />

    <hr class="divider" />

    <ExtractionResults result={poller.status.result} />

    {#if poller.status.result}
      <hr class="divider" />

      <SendToCtview
        result={poller.status.result}
        extractionState={poller.status.state}
        serverUrl={connSettings.serverUrl}
        sendResult={lastSendResult}
        onsend={handleSend}
      />
    {/if}

    <hr class="divider" />

    <History
      entries={history}
      serverUrl={connSettings.serverUrl}
      onresend={handleResend}
      onclear={handleClearHistory}
    />

    <hr class="divider" />

    <Settings preferences={prefs} onsave={handleSavePreferences} />

    <hr class="divider" />

    <DiagnosticLog />
  </div>
</main>

<ToastContainer />

<style>
  .sidepanel {
    max-width: 400px;
    margin: 0 auto;
    padding: var(--ct-space-4);
  }

  .header {
    margin-bottom: var(--ct-space-4);
  }

  .title {
    font-size: var(--ct-font-size-xl);
    font-weight: var(--ct-font-weight-semibold);
  }

  .sections {
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-4);
  }

  .divider {
    border: none;
    border-top: 1px solid var(--ct-color-border-subtle);
  }
</style>
