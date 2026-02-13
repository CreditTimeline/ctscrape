<script lang="ts">
  import { getErrorInfo } from '../lib/logger';

  let {
    errorCode,
    errorMessage = '',
  }: {
    errorCode: string;
    errorMessage?: string;
  } = $props();

  let expanded = $state(false);

  let info = $derived(getErrorInfo(errorCode));
</script>

<div class="error-details">
  {#if info}
    <p class="error-title">{info.title}</p>
    <p class="error-description">{info.description}</p>
    {#if info.troubleshooting.length > 0}
      <button
        class="troubleshoot-toggle"
        onclick={() => (expanded = !expanded)}
        aria-expanded={expanded}
      >
        {expanded ? 'Hide' : 'Show'} troubleshooting steps
      </button>
      {#if expanded}
        <ul class="troubleshoot-list">
          {#each info.troubleshooting as step}
            <li>{step}</li>
          {/each}
        </ul>
      {/if}
    {/if}
  {:else}
    <p class="error-fallback">{errorMessage || `Error: ${errorCode}`}</p>
  {/if}
</div>

<style>
  .error-details {
    font-size: var(--ct-font-size-sm);
  }

  .error-title {
    font-weight: var(--ct-font-weight-medium);
    color: var(--ct-color-error);
  }

  .error-description {
    color: var(--ct-color-text-muted);
    margin-top: var(--ct-space-1);
  }

  .troubleshoot-toggle {
    font-size: var(--ct-font-size-xs);
    color: var(--ct-color-primary);
    margin-top: var(--ct-space-1);
    padding: 0;
  }

  .troubleshoot-toggle:hover {
    text-decoration: underline;
  }

  .troubleshoot-list {
    margin-top: var(--ct-space-1);
    padding-left: var(--ct-space-4);
    font-size: var(--ct-font-size-xs);
    color: var(--ct-color-text-muted);
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-1);
  }

  .error-fallback {
    color: var(--ct-color-error);
  }
</style>
