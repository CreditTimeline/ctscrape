<script lang="ts">
  import { connectionSettings } from '../../utils/storage';

  let status = $state<'idle' | 'detected' | 'extracting' | 'error'>('idle');
  let ctviewUrl = $state('');

  $effect(() => {
    connectionSettings.getValue().then((settings) => {
      ctviewUrl = settings.serverUrl;
    });
  });
</script>

<main>
  <h1>ctscrape</h1>

  <div class="status">
    {#if status === 'idle'}
      <p class="muted">No supported credit report detected on this page.</p>
    {:else if status === 'detected'}
      <p class="ready">Credit report detected — ready to scrape.</p>
      <button>Extract Data</button>
    {:else if status === 'extracting'}
      <p>Extracting...</p>
    {:else if status === 'error'}
      <p class="error">An error occurred.</p>
    {/if}
  </div>

  <div class="connection">
    {#if ctviewUrl}
      <p class="muted">Connected to {ctviewUrl}</p>
    {:else}
      <p class="warning">ctview not configured — open settings to connect.</p>
    {/if}
  </div>
</main>
