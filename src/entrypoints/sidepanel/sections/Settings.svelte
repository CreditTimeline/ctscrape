<script lang="ts">
  import type { UserPreferences } from '../../../utils/storage';

  let {
    preferences,
    onsave,
  }: {
    preferences: UserPreferences;
    onsave: (preferences: UserPreferences) => void;
  } = $props();

  let subjectId = $state('');
  let autoExtract = $state(false);
  let theme = $state<UserPreferences['theme']>('system');

  // Sync from parent when preferences change
  $effect(() => {
    subjectId = preferences.defaultSubjectId;
    autoExtract = preferences.autoExtract;
    theme = preferences.theme;
  });

  let hasChanges = $derived(
    subjectId !== preferences.defaultSubjectId ||
    autoExtract !== preferences.autoExtract ||
    theme !== preferences.theme,
  );

  function handleSave() {
    onsave({
      defaultSubjectId: subjectId.trim(),
      autoExtract,
      theme,
    });
  }
</script>

<section class="settings">
  <h2 class="section-title">Settings</h2>

  <div class="form">
    <label class="field">
      <span class="label">Default Subject ID</span>
      <input
        type="text"
        class="input"
        placeholder="e.g. subject-001"
        bind:value={subjectId}
      />
    </label>

    <label class="checkbox-field">
      <input type="checkbox" bind:checked={autoExtract} />
      <span class="label">Auto-extract on page load</span>
    </label>

    <fieldset class="field">
      <legend class="label">Theme</legend>
      <div class="radio-group">
        <label class="radio">
          <input type="radio" bind:group={theme} value="light" />
          Light
        </label>
        <label class="radio">
          <input type="radio" bind:group={theme} value="dark" />
          Dark
        </label>
        <label class="radio">
          <input type="radio" bind:group={theme} value="system" />
          System
        </label>
      </div>
    </fieldset>

    <div class="actions">
      <button class="btn btn-primary" disabled={!hasChanges} onclick={handleSave}>
        Save
      </button>
    </div>
  </div>
</section>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-3);
  }

  .section-title {
    font-size: var(--ct-font-size-base);
    font-weight: var(--ct-font-weight-semibold);
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-3);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-1);
    border: none;
    padding: 0;
  }

  .label {
    font-size: var(--ct-font-size-sm);
    font-weight: var(--ct-font-weight-medium);
    color: var(--ct-color-text-muted);
  }

  .input {
    width: 100%;
    padding: var(--ct-space-2);
    border: 1px solid var(--ct-color-border);
    border-radius: var(--ct-radius-md);
    background: var(--ct-color-bg);
    font-size: var(--ct-font-size-sm);
  }

  .input:focus {
    outline: 2px solid var(--ct-color-primary);
    outline-offset: -1px;
  }

  .checkbox-field {
    display: flex;
    align-items: center;
    gap: var(--ct-space-2);
    cursor: pointer;
    font-size: var(--ct-font-size-sm);
  }

  .checkbox-field input[type='checkbox'] {
    width: 16px;
    height: 16px;
    accent-color: var(--ct-color-primary);
  }

  .radio-group {
    display: flex;
    gap: var(--ct-space-4);
  }

  .radio {
    display: flex;
    align-items: center;
    gap: var(--ct-space-1);
    font-size: var(--ct-font-size-sm);
    cursor: pointer;
  }

  .radio input[type='radio'] {
    accent-color: var(--ct-color-primary);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }

  .btn {
    padding: var(--ct-space-2) var(--ct-space-4);
    border-radius: var(--ct-radius-md);
    font-size: var(--ct-font-size-sm);
    font-weight: var(--ct-font-weight-medium);
    transition: opacity var(--ct-transition-fast);
  }

  .btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--ct-color-primary);
    color: var(--ct-color-text-inverse);
  }
</style>
