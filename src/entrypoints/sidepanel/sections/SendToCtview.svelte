<script lang="ts">
  import type { NormalisationResult } from '../../../normalizer/types';
  import type { ExtractionState } from '../../../extraction/types';
  import type { SendResult } from '../../../utils/messaging';
  import ConfirmDialog from '../../../components/ConfirmDialog.svelte';
  import EntitySummary from '../../../components/EntitySummary.svelte';
  import ProgressBar from '../../../components/ProgressBar.svelte';

  let {
    result,
    extractionState,
    serverUrl,
    sendResult = null,
    onsend,
  }: {
    result: NormalisationResult | undefined;
    extractionState: ExtractionState;
    serverUrl: string;
    sendResult?: SendResult | null;
    onsend: () => void;
  } = $props();

  let confirmOpen = $state(false);

  let canSend = $derived(extractionState === 'ready' && result?.success === true);
  let isSending = $derived(extractionState === 'sending');
  let isComplete = $derived(extractionState === 'complete');
  let isError = $derived(extractionState === 'error');

  function handleSendClick() {
    confirmOpen = true;
  }

  function handleConfirm() {
    confirmOpen = false;
    onsend();
  }

  function handleCancel() {
    confirmOpen = false;
  }

  function importUrl(sendRes: SendResult): string | null {
    if (!serverUrl || !sendRes.importIds?.length) return null;
    const base = serverUrl.replace(/\/$/, '');
    return `${base}/imports/${sendRes.importIds[0]}`;
  }
</script>

{#if result}
  <section class="send-section">
    <h2 class="section-title">Send to ctview</h2>

    {#if isSending}
      <ProgressBar />
      <p class="status-text">Sending data to ctview...</p>
    {:else if isComplete && sendResult?.success}
      <p class="status-text success">Data sent successfully.</p>
      {#if sendResult.duplicate}
        <p class="status-text info">This data was already imported (duplicate detected).</p>
      {/if}
      {#if importUrl(sendResult)}
        <a class="ctview-link" href={importUrl(sendResult)} target="_blank" rel="noopener noreferrer">
          View import in ctview
        </a>
      {:else if serverUrl}
        <a class="ctview-link" href={serverUrl} target="_blank" rel="noopener noreferrer">
          Open ctview
        </a>
      {/if}
    {:else if isError && sendResult && !sendResult.success}
      <p class="status-text error">{sendResult.error}</p>
      {#if sendResult.suggestion}
        <p class="status-text suggestion">{sendResult.suggestion}</p>
      {/if}
      {#if sendResult.duplicate}
        <p class="status-text info">This data was already imported.</p>
      {/if}
    {:else}
      <div class="actions">
        <button class="btn btn-primary" disabled={!canSend} onclick={handleSendClick}>
          Send to ctview
        </button>
      </div>

      {#if !serverUrl}
        <p class="status-text warning">Configure a ctview server URL in Connection Settings.</p>
      {/if}
    {/if}
  </section>

  <ConfirmDialog
    open={confirmOpen}
    title="Send to ctview"
    message="The following data will be sent to {serverUrl}:"
    confirmLabel="Send"
    onconfirm={handleConfirm}
    oncancel={handleCancel}
  >
    {#if result}
      <EntitySummary summary={result.summary} />
    {/if}
  </ConfirmDialog>
{/if}

<style>
  .send-section {
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-3);
  }

  .section-title {
    font-size: var(--ct-font-size-base);
    font-weight: var(--ct-font-weight-semibold);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
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

  .status-text {
    font-size: var(--ct-font-size-sm);
    color: var(--ct-color-text-muted);
  }

  .status-text.success {
    color: var(--ct-color-success);
  }

  .status-text.warning {
    color: var(--ct-color-warning);
  }

  .status-text.error {
    color: var(--ct-color-error);
  }

  .status-text.info {
    color: var(--ct-color-text-muted);
    font-style: italic;
  }

  .status-text.suggestion {
    color: var(--ct-color-text-muted);
    font-style: italic;
  }

  .ctview-link {
    font-size: var(--ct-font-size-sm);
  }
</style>
