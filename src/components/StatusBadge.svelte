<script lang="ts">
  import type { ExtractionState } from '../extraction/types';
  import { getStateLabel } from '../lib/format';

  let { state }: { state: ExtractionState } = $props();

  const colorMap: Record<ExtractionState, string> = {
    idle: 'var(--ct-badge-idle)',
    detected: 'var(--ct-badge-detected)',
    extracting: 'var(--ct-badge-extracting)',
    normalising: 'var(--ct-badge-normalising)',
    ready: 'var(--ct-badge-ready)',
    sending: 'var(--ct-badge-sending)',
    complete: 'var(--ct-badge-complete)',
    error: 'var(--ct-badge-error)',
  };
</script>

<span class="badge" style:--badge-color={colorMap[state]}>
  {getStateLabel(state)}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--ct-space-1);
    padding: 2px var(--ct-space-2);
    border-radius: var(--ct-radius-full);
    font-size: var(--ct-font-size-xs);
    font-weight: var(--ct-font-weight-medium);
    color: var(--ct-color-text-inverse);
    background: var(--badge-color);
    line-height: 1.4;
    white-space: nowrap;
  }
</style>
