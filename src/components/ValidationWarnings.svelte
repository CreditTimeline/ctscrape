<script lang="ts">
  import type { NormalisationWarning } from '../normalizer/types';

  let { warnings }: { warnings: NormalisationWarning[] } = $props();
</script>

{#if warnings.length > 0}
  <div class="validation-warnings">
    <p class="header">
      {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}
    </p>
    <ul>
      {#each warnings as w}
        <li class={w.severity}>
          <span class="severity-badge">{w.severity}</span>
          <span class="domain">{w.domain}</span>
          {#if w.field}
            <span class="field">{w.field}:</span>
          {/if}
          <span class="message">{w.message}</span>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .validation-warnings {
    font-size: var(--ct-font-size-sm);
    background: var(--ct-color-warning-bg);
    border: 1px solid var(--ct-color-warning);
    border-radius: var(--ct-radius-md);
    padding: var(--ct-space-3);
  }

  .header {
    font-weight: var(--ct-font-weight-semibold);
    color: var(--ct-color-warning);
    margin-bottom: var(--ct-space-2);
  }

  ul {
    padding-left: var(--ct-space-4);
    list-style: disc;
  }

  li {
    margin-bottom: var(--ct-space-1);
    line-height: 1.4;
  }

  .severity-badge {
    display: inline-block;
    padding: 0 var(--ct-space-1);
    border-radius: var(--ct-radius-sm);
    font-size: var(--ct-font-size-xs);
    font-weight: var(--ct-font-weight-medium);
    text-transform: uppercase;
    vertical-align: middle;
  }

  .info .severity-badge {
    background: var(--ct-color-info-bg);
    color: var(--ct-color-info);
  }

  .warning .severity-badge {
    background: var(--ct-color-warning-bg);
    color: var(--ct-color-warning);
  }

  .domain {
    font-weight: var(--ct-font-weight-medium);
    text-transform: capitalize;
    margin-right: var(--ct-space-1);
  }

  .field {
    font-weight: var(--ct-font-weight-medium);
    margin-right: var(--ct-space-1);
  }
</style>
