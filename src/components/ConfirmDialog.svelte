<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    open,
    title,
    message = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onconfirm,
    oncancel,
    children,
  }: {
    open: boolean;
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onconfirm: () => void;
    oncancel: () => void;
    children?: Snippet;
  } = $props();
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
  <div class="overlay" onkeydown={(e) => e.key === 'Escape' && oncancel()} onclick={oncancel}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="dialog" role="dialog" aria-modal="true" aria-label={title} tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
      <h3 class="title">{title}</h3>
      {#if message}
        <p class="message">{message}</p>
      {/if}
      {#if children}
        {@render children()}
      {/if}
      <div class="actions">
        <button class="btn btn-secondary" onclick={oncancel}>{cancelLabel}</button>
        <button class="btn btn-primary" onclick={onconfirm}>{confirmLabel}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fade-in 150ms ease-out;
  }

  .dialog {
    background: var(--ct-color-surface);
    border-radius: var(--ct-radius-lg);
    padding: var(--ct-space-5);
    max-width: 320px;
    width: 90%;
    box-shadow: var(--ct-shadow-md);
  }

  .title {
    font-size: var(--ct-font-size-base);
    font-weight: var(--ct-font-weight-semibold);
    margin-bottom: var(--ct-space-2);
  }

  .message {
    font-size: var(--ct-font-size-sm);
    color: var(--ct-color-text-muted);
    margin-bottom: var(--ct-space-4);
    line-height: 1.5;
  }

  .actions {
    display: flex;
    gap: var(--ct-space-2);
    justify-content: flex-end;
    margin-top: var(--ct-space-4);
  }

  .btn {
    padding: var(--ct-space-2) var(--ct-space-4);
    border-radius: var(--ct-radius-md);
    font-size: var(--ct-font-size-sm);
    font-weight: var(--ct-font-weight-medium);
    transition: opacity var(--ct-transition-fast);
  }

  .btn:hover {
    opacity: 0.9;
  }

  .btn-primary {
    background: var(--ct-color-primary);
    color: var(--ct-color-text-inverse);
  }

  .btn-secondary {
    background: var(--ct-color-bg-muted);
    color: var(--ct-color-text);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
