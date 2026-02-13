<script lang="ts">
  import { sendMessage } from '../../utils/messaging';
  import { connectionSettings } from '../../utils/storage';
  import { createStatusPoller } from '../../lib/status-poller.svelte';
  import StatusBadge from '../../components/StatusBadge.svelte';

  const poller = createStatusPoller();

  let ctviewUrl = $state('');

  $effect(() => {
    poller.start();
    return () => poller.stop();
  });

  $effect(() => {
    connectionSettings.getValue().then((settings) => {
      ctviewUrl = settings.serverUrl;
    });
  });

  let canScrape = $derived(poller.status.state === 'detected');

  async function handleScrape() {
    await sendMessage('triggerExtract', undefined);
  }

  async function openSidePanel() {
    const win = await browser.windows.getCurrent();
    await browser.sidePanel.open({ windowId: win.id! });
  }
</script>

<main>
  <header class="header">
    <h1>ctscrape</h1>
    <StatusBadge state={poller.status.state} />
  </header>

  <div class="actions">
    <button class="btn btn-primary" disabled={!canScrape} onclick={handleScrape}>
      Scrape This Page
    </button>
    <button class="btn btn-secondary" onclick={openSidePanel}>
      Open Side Panel
    </button>
  </div>

  <footer class="connection">
    {#if ctviewUrl}
      <span class="connection-ok">Connected to {ctviewUrl}</span>
    {:else}
      <span class="connection-warn">ctview not configured</span>
    {/if}
  </footer>
</main>
