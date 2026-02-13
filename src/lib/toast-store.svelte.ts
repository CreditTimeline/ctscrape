/**
 * Toast notification store — Svelte 5 rune-based state management.
 * Requires .svelte.ts extension for $state usage.
 */

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
}

let toasts = $state<Toast[]>([]);
let nextId = 0;

/** Add a toast notification. Returns the toast ID for manual removal. */
export function addToast(
  message: string,
  type: Toast['type'] = 'info',
  duration = 4000,
): string {
  const id = `toast-${++nextId}`;
  const toast: Toast = { id, message, type, duration };
  toasts = [...toasts, toast];

  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }

  return id;
}

/** Remove a toast by ID. */
export function removeToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
}

/** Get the current list of active toasts (reactive). */
export function getToasts(): Toast[] {
  return toasts;
}
