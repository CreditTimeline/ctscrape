/**
 * Faro SDK initialisation for extension pages (sidepanel, popup).
 * These contexts have full DOM access so the standard SDK works.
 */
import {
  initializeFaro,
  type Faro,
  ConsoleInstrumentation,
  ErrorsInstrumentation,
  SessionInstrumentation,
  WebVitalsInstrumentation,
} from '@grafana/faro-web-sdk';
import { userPreferences } from '@/utils/storage';
import { FARO_COLLECTOR_URL, FARO_APP_NAME, getFaroAppVersion, getFaroEnvironment, isFaroConfigured } from './config';

let faroInstance: Faro | null = null;

/**
 * Initialise Faro if analytics consent is granted and Faro is configured.
 * Safe to call multiple times — subsequent calls are no-ops if already initialised.
 */
export async function initFaro(): Promise<Faro | null> {
  if (faroInstance) return faroInstance;
  if (!isFaroConfigured()) return null;

  try {
    const prefs = await userPreferences.getValue();
    if (!prefs.analyticsConsent) return null;
  } catch {
    return null;
  }

  faroInstance = initializeFaro({
    url: FARO_COLLECTOR_URL,
    app: {
      name: FARO_APP_NAME,
      version: getFaroAppVersion(),
      environment: getFaroEnvironment(),
    },
    instrumentations: [
      new ErrorsInstrumentation(),
      new WebVitalsInstrumentation(),
      new ConsoleInstrumentation(),
      new SessionInstrumentation(),
    ],
  });

  return faroInstance;
}

/**
 * Get the current Faro instance, or null if not initialised.
 */
export function getFaro(): Faro | null {
  return faroInstance;
}

/**
 * Tear down Faro. Call on cleanup / when consent is revoked.
 */
export function teardownFaro(): void {
  if (faroInstance) {
    faroInstance.pause();
    faroInstance = null;
  }
}
