<script lang="ts">
  import type { NormalisationSummary } from '../normalizer/types';

  let { summary }: { summary: NormalisationSummary } = $props();

  interface Row {
    label: string;
    count: number;
  }

  let rows = $derived<Row[]>([
    { label: 'Person Names', count: summary.personNames },
    { label: 'Addresses', count: summary.addresses },
    { label: 'Tradelines', count: summary.tradelines },
    { label: 'Searches', count: summary.searches },
    { label: 'Credit Scores', count: summary.creditScores },
    { label: 'Public Records', count: summary.publicRecords },
    { label: 'Electoral Roll', count: summary.electoralRollEntries },
    { label: 'Financial Associates', count: summary.financialAssociates },
    { label: 'Fraud Markers', count: summary.fraudMarkers },
    { label: 'Notices of Correction', count: summary.noticesOfCorrection },
  ].filter((r) => r.count > 0));

  let total = $derived(rows.reduce((sum, r) => sum + r.count, 0));
</script>

<div class="entity-summary">
  {#if rows.length === 0}
    <p class="empty">No entities extracted.</p>
  {:else}
    <div class="grid">
      {#each rows as row}
        <span class="label">{row.label}</span>
        <span class="count">{row.count}</span>
      {/each}
    </div>
    <div class="total">
      <span class="label">Total</span>
      <span class="count">{total}</span>
    </div>
  {/if}
</div>

<style>
  .entity-summary {
    font-size: var(--ct-font-size-sm);
  }

  .empty {
    color: var(--ct-color-text-muted);
    font-style: italic;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--ct-space-1) var(--ct-space-3);
  }

  .label {
    color: var(--ct-color-text-muted);
  }

  .count {
    text-align: right;
    font-weight: var(--ct-font-weight-medium);
    font-variant-numeric: tabular-nums;
  }

  .total {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--ct-space-3);
    margin-top: var(--ct-space-2);
    padding-top: var(--ct-space-2);
    border-top: 1px solid var(--ct-color-border);
    font-weight: var(--ct-font-weight-semibold);
  }
</style>
