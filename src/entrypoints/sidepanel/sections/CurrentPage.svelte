<script lang="ts">
  import type { ExtractionState } from '../../../extraction/types';
  import type { PageInfo } from '../../../adapters/types';
  import StatusBadge from '../../../components/StatusBadge.svelte';
  import ProgressBar from '../../../components/ProgressBar.svelte';

  let {
    state,
    pageInfo,
    onextract,
  }: {
    state: ExtractionState;
    pageInfo: PageInfo | undefined;
    onextract: () => void;
  } = $props();

  let canExtract = $derived(state === 'detected');
  let isProcessing = $derived(state === 'extracting' || state === 'normalising');
</script>

<section class="current-page">
  <div class="section-header">
    <h2 class="section-title">Current Page</h2>
    <StatusBadge {state} />
  </div>

  {#if state === 'idle'}
    <p class="hint">Navigate to a supported credit report page to begin.</p>
    <p class="hint-detail">
      Supported: <a href="https://www.checkmyfile.com/download" target="_blank" rel="noopener noreferrer">CheckMyFile</a> download page.
    </p>
  {:else if pageInfo}
    <div class="page-info">
      <div class="info-row">
        <span class="info-label">Site</span>
        <span class="info-value">{pageInfo.siteName}</span>
      </div>
      {#if pageInfo.subjectName}
        <div class="info-row">
          <span class="info-label">Subject</span>
          <span class="info-value">{pageInfo.subjectName}</span>
        </div>
      {/if}
      {#if pageInfo.reportDate}
        <div class="info-row">
          <span class="info-label">Report Date</span>
          <span class="info-value">{pageInfo.reportDate}</span>
        </div>
      {/if}
      {#if pageInfo.providers.length > 0}
        <div class="info-row">
          <span class="info-label">Providers</span>
          <span class="info-value">{pageInfo.providers.join(', ')}</span>
        </div>
      {/if}
    </div>
  {/if}

  {#if isProcessing}
    <ProgressBar />
  {/if}

  <div class="actions">
    <button class="btn btn-primary" disabled={!canExtract} onclick={onextract}>
      Extract Data
    </button>
  </div>
</section>

<style>
  .current-page {
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-3);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-title {
    font-size: var(--ct-font-size-base);
    font-weight: var(--ct-font-weight-semibold);
  }

  .hint {
    font-size: var(--ct-font-size-sm);
    color: var(--ct-color-text-muted);
  }

  .hint-detail {
    font-size: var(--ct-font-size-xs);
    color: var(--ct-color-text-muted);
  }

  .page-info {
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-1);
    padding: var(--ct-space-2) var(--ct-space-3);
    background: var(--ct-color-bg-subtle);
    border-radius: var(--ct-radius-md);
    font-size: var(--ct-font-size-sm);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    gap: var(--ct-space-2);
  }

  .info-label {
    color: var(--ct-color-text-muted);
    flex-shrink: 0;
  }

  .info-value {
    text-align: right;
    font-weight: var(--ct-font-weight-medium);
    word-break: break-word;
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
</style>
