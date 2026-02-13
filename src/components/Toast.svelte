<script lang="ts">
  import type { Toast } from '../lib/toast-store.svelte';
  import { removeToast } from '../lib/toast-store.svelte';

  let { toast }: { toast: Toast } = $props();
</script>

<div class="toast toast-{toast.type}" role="alert">
  <span class="message">{toast.message}</span>
  <button class="dismiss" onclick={() => removeToast(toast.id)} aria-label="Dismiss">
    &times;
  </button>
</div>

<style>
  .toast {
    display: flex;
    align-items: center;
    gap: var(--ct-space-2);
    padding: var(--ct-space-2) var(--ct-space-3);
    border-radius: var(--ct-radius-md);
    font-size: var(--ct-font-size-sm);
    box-shadow: var(--ct-shadow-md);
    animation: slide-in 200ms ease-out;
  }

  .toast-success {
    background: var(--ct-color-success);
    color: var(--ct-color-text-inverse);
  }

  .toast-error {
    background: var(--ct-color-error);
    color: var(--ct-color-text-inverse);
  }

  .toast-warning {
    background: var(--ct-color-warning);
    color: var(--ct-color-text-inverse);
  }

  .toast-info {
    background: var(--ct-color-info);
    color: var(--ct-color-text-inverse);
  }

  .message {
    flex: 1;
  }

  .dismiss {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--ct-radius-sm);
    color: inherit;
    opacity: 0.7;
    font-size: var(--ct-font-size-lg);
    line-height: 1;
  }

  .dismiss:hover {
    opacity: 1;
  }

  @keyframes slide-in {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>
