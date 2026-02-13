<script lang="ts">
  import type { NormalisationResult } from '../../../normalizer/types';
  import type { ExtractionState } from '../../../extraction/types';
  import ConfirmDialog from '../../../components/ConfirmDialog.svelte';
  import EntitySummary from '../../../components/EntitySummary.svelte';
  import ProgressBar from '../../../components/ProgressBar.svelte';

  let {
    result,
    extractionState,
    serverUrl,
    onsend,
  }: {
    result: NormalisationResult | undefined;
    extractionState: ExtractionState;
    serverUrl: string;
    onsend: () => void;
  } = $props();

  let confirmOpen = $state(false);

  let canSend = $derived(extractionState === 'ready' && result?.success === true);
  let isSending = $derived(extractionState === 'sending');
  let isComplete = $derived(extractionState === 'complete');

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
</script>

{#if result}
  <section class="send-section">
    <h2 class="section-title">Send to ctview</h2>

    {#if isSending}
      <ProgressBar />
      <p class="status-text">Sending data to ctview...</p>
    {:else if isComplete}
      <p class="status-text success">Data sent successfully.</p>
      {#if serverUrl}
        <a class="ctview-link" href={serverUrl} target="_blank" rel="noopener noreferrer">
          Open ctview
        </a>
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

  .ctview-link {
    font-size: var(--ct-font-size-sm);
  }
</style>
