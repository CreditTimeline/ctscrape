<script lang="ts">
  import type { ConnectionSettings } from '../../../utils/storage';
  import type { ConnectionTestResult } from '../../../lib/ctview-client';
  import { sendMessage } from '../../../utils/messaging';
  import ExpandableSection from '../../../components/ExpandableSection.svelte';

  let {
    settings,
    onsave,
  }: {
    settings: ConnectionSettings;
    onsave: (settings: ConnectionSettings) => void;
  } = $props();

  let serverUrl = $state('');
  let apiKey = $state('');
  let showKey = $state(false);
  let testing = $state(false);
  let testResult = $state<ConnectionTestResult | null>(null);

  // Sync from parent when settings change
  $effect(() => {
    serverUrl = settings.serverUrl;
    apiKey = settings.apiKey;
  });

  let hasChanges = $derived(serverUrl !== settings.serverUrl || apiKey !== settings.apiKey);
  let isConfigured = $derived(settings.serverUrl !== '' && settings.apiKey !== '');

  function handleSave() {
    const trimmedUrl = serverUrl.trim().replace(/\/$/, '');
    onsave({ serverUrl: trimmedUrl, apiKey: apiKey.trim() });
    testResult = null;
  }

  async function handleTestConnection() {
    testing = true;
    testResult = null;
    try {
      testResult = await sendMessage('testConnection', undefined);
    } catch (e) {
      testResult = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    } finally {
      testing = false;
    }
  }
</script>

<ExpandableSection title="Connection Settings" open={!isConfigured}>
  {#snippet children()}
    <div class="form">
      <label class="field">
        <span class="label">ctview Server URL</span>
        <input
          type="url"
          class="input"
          placeholder="https://ctview.example.com"
          bind:value={serverUrl}
        />
      </label>

      <label class="field">
        <span class="label">API Key</span>
        <div class="key-input">
          <input
            type={showKey ? 'text' : 'password'}
            class="input"
            placeholder="Enter API key"
            bind:value={apiKey}
          />
          <button
            class="toggle-key"
            type="button"
            onclick={() => (showKey = !showKey)}
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
      </label>

      <div class="actions">
        <button
          class="btn btn-secondary"
          disabled={!isConfigured || testing}
          onclick={handleTestConnection}
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        <button class="btn btn-primary" disabled={!hasChanges} onclick={handleSave}>
          Save
        </button>
      </div>

      {#if testResult}
        {#if testResult.success}
          <p class="status connected">Server ready</p>
        {:else}
          <p class="status error">{testResult.error}</p>
          {#if testResult.suggestion}
            <p class="status suggestion">{testResult.suggestion}</p>
          {/if}
        {/if}
      {:else if isConfigured}
        <p class="status connected">Connected to {settings.serverUrl}</p>
      {:else}
        <p class="status not-connected">Not configured</p>
      {/if}
    </div>
  {/snippet}
</ExpandableSection>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-3);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-1);
  }

  .label {
    font-size: var(--ct-font-size-sm);
    font-weight: var(--ct-font-weight-medium);
    color: var(--ct-color-text-muted);
  }

  .input {
    width: 100%;
    padding: var(--ct-space-2);
    border: 1px solid var(--ct-color-border);
    border-radius: var(--ct-radius-md);
    background: var(--ct-color-bg);
    font-size: var(--ct-font-size-sm);
  }

  .input:focus {
    outline: 2px solid var(--ct-color-primary);
    outline-offset: -1px;
  }

  .key-input {
    display: flex;
    gap: var(--ct-space-1);
  }

  .key-input .input {
    flex: 1;
  }

  .toggle-key {
    padding: var(--ct-space-1) var(--ct-space-2);
    font-size: var(--ct-font-size-xs);
    color: var(--ct-color-primary);
    white-space: nowrap;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--ct-space-2);
  }

  .btn {
    padding: var(--ct-space-2) var(--ct-space-4);
    border-radius: var(--ct-radius-md);
    font-size: var(--ct-font-size-sm);
    font-weight: var(--ct-font-weight-medium);
    transition: opacity var(--ct-transition-fast);
  }

  .btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--ct-color-primary);
    color: var(--ct-color-text-inverse);
  }

  .btn-secondary {
    background: var(--ct-color-bg-subtle);
    color: var(--ct-color-text);
    border: 1px solid var(--ct-color-border);
  }

  .status {
    font-size: var(--ct-font-size-xs);
    padding: var(--ct-space-1) 0;
  }

  .connected {
    color: var(--ct-color-success);
  }

  .not-connected {
    color: var(--ct-color-text-muted);
  }

  .error {
    color: var(--ct-color-error);
  }

  .suggestion {
    color: var(--ct-color-text-muted);
    font-style: italic;
  }
</style>
