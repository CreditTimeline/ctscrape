<script lang="ts">
  import type { ScrapeHistoryEntry } from '../../../utils/storage';
  import { formatDateTime } from '../../../lib/format';
  import ConfirmDialog from '../../../components/ConfirmDialog.svelte';

  let {
    entries,
    serverUrl = '',
    onresend,
    onclear,
  }: {
    entries: ScrapeHistoryEntry[];
    serverUrl?: string;
    onresend: (entry: ScrapeHistoryEntry) => void;
    onclear: () => void;
  } = $props();

  let clearConfirmOpen = $state(false);

  const statusColors: Record<ScrapeHistoryEntry['status'], string> = {
    pending: 'var(--ct-color-warning)',
    sent: 'var(--ct-color-success)',
    failed: 'var(--ct-color-error)',
  };

  function totalEntities(counts: Record<string, number>): number {
    return Object.values(counts).reduce((sum, n) => sum + n, 0);
  }

  function importLink(entry: ScrapeHistoryEntry): string | null {
    if (!serverUrl || entry.status !== 'sent' || !entry.receiptId) return null;
    const base = serverUrl.replace(/\/$/, '');
    return `${base}/imports/${entry.receiptId}`;
  }
</script>

<section class="history">
  <div class="section-header">
    <h2 class="section-title">History</h2>
    {#if entries.length > 0}
      <button class="btn-text" onclick={() => (clearConfirmOpen = true)}>Clear</button>
    {/if}
  </div>

  {#if entries.length === 0}
    <p class="empty">No scrape history yet.</p>
  {:else}
    <ul class="entry-list">
      {#each entries as entry (entry.id)}
        <li class="entry">
          <div class="entry-header">
            <span class="site-name">{entry.siteName}</span>
            <div class="entry-header-right">
              {#if importLink(entry)}
                <a
                  class="import-link"
                  href={importLink(entry)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View in ctview"
                >&#8599;</a>
              {/if}
              <span class="status-dot" style:background={statusColors[entry.status]}></span>
            </div>
          </div>
          <div class="entry-meta">
            <span class="date">{formatDateTime(entry.extractedAt)}</span>
            <span class="entity-count">{totalEntities(entry.entityCounts)} entities</span>
          </div>
          {#if entry.error}
            <p class="entry-error">{entry.error}</p>
          {/if}
          {#if entry.status === 'failed'}
            <button class="btn-text resend" onclick={() => onresend(entry)}>Resend</button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <ConfirmDialog
    open={clearConfirmOpen}
    title="Clear History"
    message="This will permanently remove all scrape history entries."
    confirmLabel="Clear All"
    onconfirm={() => { clearConfirmOpen = false; onclear(); }}
    oncancel={() => (clearConfirmOpen = false)}
  />
</section>

<style>
  .history {
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

  .btn-text {
    font-size: var(--ct-font-size-xs);
    color: var(--ct-color-text-muted);
    padding: var(--ct-space-1) var(--ct-space-2);
  }

  .btn-text:hover {
    color: var(--ct-color-text);
  }

  .empty {
    font-size: var(--ct-font-size-sm);
    color: var(--ct-color-text-muted);
    font-style: italic;
  }

  .entry-list {
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-2);
  }

  .entry {
    padding: var(--ct-space-2) var(--ct-space-3);
    background: var(--ct-color-bg-subtle);
    border-radius: var(--ct-radius-md);
    border: 1px solid var(--ct-color-border-subtle);
  }

  .entry-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .entry-header-right {
    display: flex;
    align-items: center;
    gap: var(--ct-space-2);
  }

  .import-link {
    font-size: var(--ct-font-size-sm);
    color: var(--ct-color-primary);
    text-decoration: none;
    line-height: 1;
  }

  .import-link:hover {
    text-decoration: underline;
  }

  .site-name {
    font-size: var(--ct-font-size-sm);
    font-weight: var(--ct-font-weight-medium);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--ct-radius-full);
    flex-shrink: 0;
  }

  .entry-meta {
    display: flex;
    justify-content: space-between;
    font-size: var(--ct-font-size-xs);
    color: var(--ct-color-text-muted);
    margin-top: var(--ct-space-1);
  }

  .entry-error {
    font-size: var(--ct-font-size-xs);
    color: var(--ct-color-error);
    margin-top: var(--ct-space-1);
  }

  .resend {
    margin-top: var(--ct-space-1);
    color: var(--ct-color-primary);
    font-size: var(--ct-font-size-xs);
    padding: 0;
  }
</style>
