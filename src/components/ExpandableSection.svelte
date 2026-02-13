<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    count,
    open: initialOpen = false,
    children,
  }: {
    title: string;
    count?: number;
    open?: boolean;
    children: Snippet;
  } = $props();

  let expanded = $state(false);

  // Sync expanded state when parent changes the open prop
  $effect(() => {
    expanded = initialOpen;
  });
</script>

<div class="expandable-section">
  <button class="header" onclick={() => (expanded = !expanded)} aria-expanded={expanded}>
    <span class="chevron" class:open={expanded}>&#9654;</span>
    <span class="title">{title}</span>
    {#if count != null}
      <span class="count">{count}</span>
    {/if}
  </button>
  {#if expanded}
    <div class="content">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .expandable-section {
    border: 1px solid var(--ct-color-border);
    border-radius: var(--ct-radius-md);
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    gap: var(--ct-space-2);
    width: 100%;
    padding: var(--ct-space-2) var(--ct-space-3);
    background: var(--ct-color-bg-subtle);
    text-align: left;
    font-size: var(--ct-font-size-sm);
    font-weight: var(--ct-font-weight-medium);
    transition: background var(--ct-transition-fast);
  }

  .header:hover {
    background: var(--ct-color-bg-muted);
  }

  .chevron {
    display: inline-block;
    font-size: var(--ct-font-size-xs);
    transition: transform var(--ct-transition-fast);
    color: var(--ct-color-text-muted);
  }

  .chevron.open {
    transform: rotate(90deg);
  }

  .title {
    flex: 1;
  }

  .count {
    color: var(--ct-color-text-muted);
    font-size: var(--ct-font-size-xs);
    background: var(--ct-color-bg-muted);
    padding: 0 var(--ct-space-2);
    border-radius: var(--ct-radius-full);
  }

  .content {
    padding: var(--ct-space-3);
    border-top: 1px solid var(--ct-color-border);
  }
</style>
