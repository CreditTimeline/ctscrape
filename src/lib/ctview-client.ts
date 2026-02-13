/**
 * Client management — cached CtviewClient singleton for the service worker,
 * connection testing, and error classification.
 */

import { CtviewClient } from './ctview-sdk/client';
import { CtviewApiError } from './ctview-sdk/errors';
import { connectionSettings } from '../utils/storage';

export { CtviewApiError };

export interface ConnectionTestResult {
  success: boolean;
  status?: string;
  error?: string;
  errorCode?: string;
  suggestion?: string;
}

let cachedClient: CtviewClient | null = null;
let cachedSettings: { serverUrl: string; apiKey: string } | null = null;

/**
 * Get or create a CtviewClient from stored connection settings.
 * Returns null if serverUrl is empty. Re-creates if settings changed.
 */
export async function getClient(): Promise<CtviewClient | null> {
  const settings = await connectionSettings.getValue();

  if (!settings.serverUrl) {
    cachedClient = null;
    cachedSettings = null;
    return null;
  }

  if (
    cachedClient &&
    cachedSettings &&
    cachedSettings.serverUrl === settings.serverUrl &&
    cachedSettings.apiKey === settings.apiKey
  ) {
    return cachedClient;
  }

  cachedClient = new CtviewClient({
    baseUrl: settings.serverUrl,
    apiKey: settings.apiKey || undefined,
  });
  cachedSettings = { serverUrl: settings.serverUrl, apiKey: settings.apiKey };

  return cachedClient;
}

/** Clear the cached client — call when settings change. */
export function invalidateClient(): void {
  cachedClient = null;
  cachedSettings = null;
}

/** Test connection to the ctview server. */
export async function testConnection(): Promise<ConnectionTestResult> {
  const client = await getClient();
  if (!client) {
    return {
      success: false,
      error: 'ctview server URL is not configured',
      suggestion: 'Enter a server URL in Connection Settings.',
    };
  }

  try {
    const result = await client.checkReady();
    return { success: true, status: result.status };
  } catch (err) {
    return classifyConnectionError(err);
  }
}

function classifyConnectionError(err: unknown): ConnectionTestResult {
  if (err instanceof CtviewApiError) {
    if (err.status === 401 || err.code === 'UNAUTHORIZED') {
      return {
        success: false,
        error: 'Authentication failed',
        errorCode: 'UNAUTHORIZED',
        suggestion: 'Check your API key is correct.',
      };
    }
    if (err.status === 403) {
      return {
        success: false,
        error: 'Access denied',
        errorCode: 'FORBIDDEN',
        suggestion: 'Check your API key has the required permissions.',
      };
    }
    if (err.status === 503 || err.code === 'NOT_READY') {
      return {
        success: false,
        error: 'Server is starting up',
        errorCode: 'NOT_READY',
        suggestion: 'Wait a moment and try again.',
      };
    }
    return {
      success: false,
      error: err.message,
      errorCode: err.code,
    };
  }

  if (err instanceof TypeError && err.message.includes('fetch')) {
    // CORS or network error — both manifest as TypeError from fetch
    return {
      success: false,
      error: 'Could not connect to server',
      errorCode: 'NETWORK_ERROR',
      suggestion:
        'Check the URL is correct and the server is running. ' +
        'If the server is running, it may need CORS_ALLOW_ORIGIN configured for the extension.',
    };
  }

  return {
    success: false,
    error: err instanceof Error ? err.message : String(err),
    errorCode: 'UNKNOWN',
  };
}

/**
 * Classify a send (ingest) error into a structured result.
 * Returns whether the error is retryable.
 */
export function classifySendError(err: unknown): {
  error: string;
  errorCode: string;
  suggestion?: string;
  retryable: boolean;
  duplicate?: boolean;
  details?: Array<{ path?: string; message: string }>;
} {
  if (err instanceof CtviewApiError) {
    if (err.code === 'VALIDATION_FAILED' || err.status === 422) {
      return {
        error: err.message,
        errorCode: 'VALIDATION_FAILED',
        suggestion: 'The data did not pass server-side validation. Check the extraction results.',
        retryable: false,
        details: err.details,
      };
    }
    if (err.code === 'DUPLICATE_IMPORT') {
      return {
        error: 'This data was already imported',
        errorCode: 'DUPLICATE_IMPORT',
        retryable: false,
        duplicate: true,
      };
    }
    if (err.status === 401 || err.code === 'UNAUTHORIZED') {
      return {
        error: 'Authentication failed',
        errorCode: 'UNAUTHORIZED',
        suggestion: 'Check your API key is correct.',
        retryable: false,
      };
    }
    if (err.status === 429 || err.code === 'RATE_LIMITED') {
      return {
        error: 'Rate limited by server',
        errorCode: 'RATE_LIMITED',
        suggestion: 'Queued for automatic retry.',
        retryable: true,
      };
    }
    if (err.status === 503 || err.code === 'NOT_READY') {
      return {
        error: 'Server is not ready',
        errorCode: 'NOT_READY',
        suggestion: 'Queued for automatic retry.',
        retryable: true,
      };
    }
    if (err.status >= 500) {
      return {
        error: err.message,
        errorCode: err.code,
        suggestion: 'Queued for automatic retry.',
        retryable: true,
      };
    }
    return {
      error: err.message,
      errorCode: err.code,
      retryable: false,
    };
  }

  // Network errors are retryable
  if (err instanceof TypeError && err.message.includes('fetch')) {
    return {
      error: 'Could not connect to server',
      errorCode: 'NETWORK_ERROR',
      suggestion: 'Queued for automatic retry. Check the server is running.',
      retryable: true,
    };
  }

  return {
    error: err instanceof Error ? err.message : String(err),
    errorCode: 'UNKNOWN',
    retryable: false,
  };
}
