<script lang="ts">
  import { getToasts } from '../lib/toast-store.svelte';
  import Toast from './Toast.svelte';

  let toasts = $derived(getToasts());
</script>

{#if toasts.length > 0}
  <div class="toast-container" aria-live="polite">
    {#each toasts as toast (toast.id)}
      <Toast {toast} />
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    top: var(--ct-space-3);
    right: var(--ct-space-3);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-2);
    max-width: 320px;
  }
</style>
