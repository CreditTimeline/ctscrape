<script lang="ts">
  import type { NormalisationResult } from '../../../normalizer/types';
  import EntitySummary from '../../../components/EntitySummary.svelte';
  import ValidationErrors from '../../../components/ValidationErrors.svelte';
  import ValidationWarnings from '../../../components/ValidationWarnings.svelte';
  import ExpandableSection from '../../../components/ExpandableSection.svelte';
  import StatusBadge from '../../../components/StatusBadge.svelte';

  let {
    result,
  }: {
    result: NormalisationResult | undefined;
  } = $props();
</script>

{#if result}
  <section class="extraction-results">
    <div class="section-header">
      <h2 class="section-title">Extraction Results</h2>
      <StatusBadge state={result.success ? 'ready' : 'error'} />
    </div>

    <EntitySummary summary={result.summary} />

    {#if result.errors.length > 0}
      <ExpandableSection title="Validation Errors" count={result.errors.length} open={true}>
        {#snippet children()}
          <ValidationErrors errors={result.errors} />
        {/snippet}
      </ExpandableSection>
    {/if}

    {#if result.warnings.length > 0}
      <ExpandableSection title="Warnings" count={result.warnings.length}>
        {#snippet children()}
          <ValidationWarnings warnings={result.warnings} />
        {/snippet}
      </ExpandableSection>
    {/if}
  </section>
{/if}

<style>
  .extraction-results {
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
</style>
