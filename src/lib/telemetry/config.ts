/**
 * Grafana Faro configuration.
 *
 * The collector URL is the public Faro endpoint from Grafana Cloud.
 * Replace the placeholder below with your actual Faro collector URL.
 */

// TODO: Replace with your Grafana Cloud Faro collector URL
export const FARO_COLLECTOR_URL = '';

export const FARO_APP_NAME = 'ctscrape';

export function getFaroAppVersion(): string {
  try {
    return browser.runtime.getManifest().version;
  } catch {
    return '0.0.0';
  }
}

export function getFaroEnvironment(): string {
  return import.meta.env.DEV ? 'development' : 'production';
}

export function isFaroConfigured(): boolean {
  return FARO_COLLECTOR_URL !== '';
}
