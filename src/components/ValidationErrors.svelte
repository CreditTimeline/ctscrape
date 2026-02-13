<script lang="ts">
  import type { NormalisationError } from '../normalizer/types';

  let { errors }: { errors: NormalisationError[] } = $props();

  // Group errors by domain
  let grouped = $derived(
    errors.reduce<Record<string, NormalisationError[]>>((acc, err) => {
      const key = err.domain;
      if (!acc[key]) acc[key] = [];
      acc[key]!.push(err);
      return acc;
    }, {}),
  );
</script>

{#if errors.length > 0}
  <div class="validation-errors">
    <p class="header">
      {errors.length} validation {errors.length === 1 ? 'error' : 'errors'}
    </p>
    {#each Object.entries(grouped) as [domain, domainErrors]}
      <div class="domain-group">
        <span class="domain-label">{domain}</span>
        <ul>
          {#each domainErrors as err}
            <li>
              {#if err.field}
                <span class="field">{err.field}:</span>
              {/if}
              <span class="message">{err.message}</span>
              {#if err.rawValue}
                <span class="raw-value">"{err.rawValue}"</span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
{/if}

<style>
  .validation-errors {
    font-size: var(--ct-font-size-sm);
    background: var(--ct-color-error-bg);
    border: 1px solid var(--ct-color-error);
    border-radius: var(--ct-radius-md);
    padding: var(--ct-space-3);
  }

  .header {
    font-weight: var(--ct-font-weight-semibold);
    color: var(--ct-color-error);
    margin-bottom: var(--ct-space-2);
  }

  .domain-group {
    margin-bottom: var(--ct-space-2);
  }

  .domain-group:last-child {
    margin-bottom: 0;
  }

  .domain-label {
    font-weight: var(--ct-font-weight-medium);
    text-transform: capitalize;
  }

  ul {
    margin-top: var(--ct-space-1);
    padding-left: var(--ct-space-4);
    list-style: disc;
  }

  li {
    margin-bottom: var(--ct-space-1);
    line-height: 1.4;
  }

  .field {
    font-weight: var(--ct-font-weight-medium);
    margin-right: var(--ct-space-1);
  }

  .message {
    color: var(--ct-color-text);
  }

  .raw-value {
    color: var(--ct-color-text-muted);
    font-style: italic;
    font-size: var(--ct-font-size-xs);
  }
</style>
