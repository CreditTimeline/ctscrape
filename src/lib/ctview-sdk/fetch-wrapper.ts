import { CtviewApiError } from './errors';

export interface FetchOptions {
  baseUrl: string;
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
  headers?: Record<string, string>;
}

export async function apiFetch<T>(
  options: FetchOptions,
  path: string,
  init?: RequestInit & { params?: Record<string, string | number | undefined> },
): Promise<T> {
  const fetchFn = options.fetch ?? globalThis.fetch;
  const url = new URL(path, options.baseUrl);

  if (init?.params) {
    for (const [key, value] of Object.entries(init.params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    ...options.headers,
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  if (options.apiKey) {
    headers['Authorization'] = `Bearer ${options.apiKey}`;
  }

  const response = await fetchFn(url.toString(), {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = body?.error;
    throw new CtviewApiError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? response.statusText,
      error?.details,
    );
  }

  const body = await response.json();
  return body.data as T;
}
