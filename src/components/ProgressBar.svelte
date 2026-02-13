<script lang="ts">
  let { value }: { value?: number } = $props();

  let determinate = $derived(value != null);
  let percent = $derived(value != null ? Math.min(100, Math.max(0, value)) : 0);
</script>

<div class="progress-bar" role="progressbar" aria-valuenow={determinate ? percent : undefined}>
  <div
    class="bar"
    class:indeterminate={!determinate}
    style:width={determinate ? `${percent}%` : undefined}
  ></div>
</div>

<style>
  .progress-bar {
    width: 100%;
    height: 4px;
    background: var(--ct-color-bg-muted);
    border-radius: var(--ct-radius-full);
    overflow: hidden;
  }

  .bar {
    height: 100%;
    background: var(--ct-color-primary);
    border-radius: var(--ct-radius-full);
    transition: width var(--ct-transition-normal);
  }

  .indeterminate {
    width: 40% !important;
    animation: slide 1.5s ease-in-out infinite;
  }

  @keyframes slide {
    0% {
      transform: translateX(-100%);
    }
    50% {
      transform: translateX(150%);
    }
    100% {
      transform: translateX(-100%);
    }
  }
</style>
