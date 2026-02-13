<script lang="ts">
  import { sendMessage } from '../../../utils/messaging';
  import type { LogEntry, LogLevel, LogCategory } from '../../../lib/logger/types';
  import ExpandableSection from '../../../components/ExpandableSection.svelte';
  import ConfirmDialog from '../../../components/ConfirmDialog.svelte';

  let entries = $state<LogEntry[]>([]);
  let levelFilter = $state<LogLevel | ''>('');
  let categoryFilter = $state<LogCategory | ''>('');
  let clearConfirmOpen = $state(false);
  let loading = $state(false);

  let errorCount = $derived(entries.filter((e) => e.level === 'error').length);
  let warnCount = $derived(entries.filter((e) => e.level === 'warn').length);

  let filteredEntries = $derived(() => {
    let result = entries;
    if (levelFilter) result = result.filter((e) => e.level === levelFilter);
    if (categoryFilter) result = result.filter((e) => e.category === categoryFilter);
    return result.slice().reverse();
  });

  async function loadLogs() {
    loading = true;
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      entries = await sendMessage('getLogs', { filter: { since: sevenDaysAgo } });
    } catch {
      entries = [];
    } finally {
      loading = false;
    }
  }

  async function handleExport() {
    try {
      const bundle = await sendMessage('exportLogs', undefined);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ctscrape-logs-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silently fail — export is best-effort
    }
  }

  async function handleSupportBundle() {
    try {
      const bundle = await sendMessage('exportSupportBundle', undefined);
      const dateStr = new Date().toISOString().slice(0, 10);

      // Download the bundle
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ctscrape-support-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Open mailto with instructions
      const version = bundle.extensionVersion;
      const subject = encodeURIComponent(`ctscrape support - v${version}`);
      const body = encodeURIComponent(
        `Please describe your issue below and attach the support bundle file that was just downloaded (ctscrape-support-${dateStr}.json).\n\n---\nIssue description:\n\n`,
      );
      window.open(`mailto:ctscrape@credittimeline.uk?subject=${subject}&body=${body}`, '_blank');
    } catch {
      // Silently fail
    }
  }

  async function handleClear() {
    clearConfirmOpen = false;
    await sendMessage('clearLogs', undefined);
    entries = [];
  }

  function levelColor(level: LogLevel): string {
    switch (level) {
      case 'error': return 'var(--ct-color-error)';
      case 'warn': return 'var(--ct-color-warning)';
      case 'info': return 'var(--ct-color-primary)';
      case 'debug': return 'var(--ct-color-text-muted)';
    }
  }

  function formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  // Load logs when section mounts
  $effect(() => {
    loadLogs();
  });
</script>

<ExpandableSection title="Diagnostic Log" count={errorCount + warnCount}>
  {#snippet children()}
    <div class="diagnostic-log">
      <p class="summary">
        {errorCount} error{errorCount !== 1 ? 's' : ''}, {warnCount} warning{warnCount !== 1 ? 's' : ''} in last 7 days
      </p>

      <div class="controls">
        <select class="filter" bind:value={levelFilter}>
          <option value="">All levels</option>
          <option value="error">Error</option>
          <option value="warn">Warning</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
        <select class="filter" bind:value={categoryFilter}>
          <option value="">All categories</option>
          <option value="extraction">Extraction</option>
          <option value="normalisation">Normalisation</option>
          <option value="api">API</option>
          <option value="retry">Retry</option>
          <option value="storage">Storage</option>
          <option value="lifecycle">Lifecycle</option>
          <option value="adapter">Adapter</option>
        </select>
      </div>

      <div class="actions">
        <button class="btn-text" onclick={loadLogs} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        <button class="btn-text" onclick={handleExport}>Export</button>
        <button class="btn-text btn-support" onclick={handleSupportBundle}>Support Bundle</button>
        <button class="btn-text btn-danger" onclick={() => (clearConfirmOpen = true)}>Clear</button>
      </div>

      {#if filteredEntries().length === 0}
        <p class="empty">No log entries.</p>
      {:else}
        <ul class="log-list">
          {#each filteredEntries() as entry (entry.id)}
            <li class="log-entry">
              <div class="log-header">
                <span class="log-level" style:color={levelColor(entry.level)}>{entry.level.toUpperCase()}</span>
                <span class="log-category">{entry.category}</span>
                <span class="log-time">{formatTime(entry.timestamp)}</span>
              </div>
              <p class="log-message">{entry.message}</p>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <ConfirmDialog
      open={clearConfirmOpen}
      title="Clear Diagnostic Logs"
      message="This will permanently remove all diagnostic log entries."
      confirmLabel="Clear All"
      onconfirm={handleClear}
      oncancel={() => (clearConfirmOpen = false)}
    />
  {/snippet}
</ExpandableSection>

<style>
  .diagnostic-log {
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-2);
  }

  .summary {
    font-size: var(--ct-font-size-sm);
    color: var(--ct-color-text-muted);
  }

  .controls {
    display: flex;
    gap: var(--ct-space-2);
  }

  .filter {
    flex: 1;
    padding: var(--ct-space-1) var(--ct-space-2);
    border: 1px solid var(--ct-color-border);
    border-radius: var(--ct-radius-md);
    background: var(--ct-color-bg);
    font-size: var(--ct-font-size-xs);
  }

  .actions {
    display: flex;
    gap: var(--ct-space-2);
    justify-content: flex-end;
  }

  .btn-text {
    font-size: var(--ct-font-size-xs);
    color: var(--ct-color-text-muted);
    padding: var(--ct-space-1) var(--ct-space-2);
  }

  .btn-text:hover:not(:disabled) {
    color: var(--ct-color-text);
  }

  .btn-text:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-support {
    color: var(--ct-color-primary);
  }

  .btn-danger {
    color: var(--ct-color-error);
  }

  .btn-danger:hover {
    color: var(--ct-color-error);
    opacity: 0.8;
  }

  .empty {
    font-size: var(--ct-font-size-sm);
    color: var(--ct-color-text-muted);
    font-style: italic;
  }

  .log-list {
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-1);
    max-height: 300px;
    overflow-y: auto;
  }

  .log-entry {
    padding: var(--ct-space-1) var(--ct-space-2);
    background: var(--ct-color-bg-subtle);
    border-radius: var(--ct-radius-md);
    border: 1px solid var(--ct-color-border-subtle);
  }

  .log-header {
    display: flex;
    align-items: center;
    gap: var(--ct-space-2);
    font-size: var(--ct-font-size-xs);
  }

  .log-level {
    font-weight: var(--ct-font-weight-semibold);
    text-transform: uppercase;
    min-width: 3.5em;
  }

  .log-category {
    color: var(--ct-color-text-muted);
  }

  .log-time {
    color: var(--ct-color-text-muted);
    margin-left: auto;
  }

  .log-message {
    font-size: var(--ct-font-size-xs);
    color: var(--ct-color-text);
    margin-top: var(--ct-space-1);
    word-break: break-word;
  }
</style>
