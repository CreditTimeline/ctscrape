/**
 * Theme management — reads user preference, watches system theme, sets data-theme attribute.
 * Uses Svelte 5 runes ($state, $effect) — requires .svelte.ts extension.
 */

import { userPreferences } from '../utils/storage';

type Theme = 'light' | 'dark';

let current = $state<Theme>('light');

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  current = theme;
}

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Initialise theme from stored preference + system detection. */
export function initTheme(): void {
  // Read stored preference
  userPreferences.getValue().then((prefs) => {
    if (prefs.theme === 'system') {
      applyTheme(getSystemTheme());
    } else {
      applyTheme(prefs.theme);
    }
  });

  // Watch system theme changes
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    userPreferences.getValue().then((prefs) => {
      if (prefs.theme === 'system') {
        applyTheme(getSystemTheme());
      }
    });
  });
}

/** Set theme preference and apply immediately. */
export async function setTheme(preference: 'light' | 'dark' | 'system'): Promise<void> {
  const prefs = await userPreferences.getValue();
  await userPreferences.setValue({ ...prefs, theme: preference });

  if (preference === 'system') {
    applyTheme(getSystemTheme());
  } else {
    applyTheme(preference);
  }
}

/** Get the current resolved theme. */
export function getCurrentTheme(): Theme {
  return current;
}
