import { userPreferences, ga4ClientId } from '@/utils/storage';

declare const __GA4_MEASUREMENT_ID__: string;
declare const __GA4_API_SECRET__: string;

const MEASUREMENT_ID = __GA4_MEASUREMENT_ID__;
const API_SECRET = __GA4_API_SECRET__;

const COLLECT_URL = 'https://www.google-analytics.com/mp/collect';
const DEBUG_URL = 'https://www.google-analytics.com/debug/mp/collect';

interface GA4Event {
  name: string;
  params: Record<string, string | number>;
}

interface GA4Payload {
  client_id: string;
  events: GA4Event[];
  user_properties?: Record<string, { value: string | number }>;
}

async function getClientId(): Promise<string> {
  const existing = await ga4ClientId.getValue();
  if (existing) return existing;

  const ts = Math.floor(Date.now() / 1000);
  const rand = Math.random().toString(36).slice(2, 12);
  const id = `${rand}.${ts}`;
  await ga4ClientId.setValue(id);
  return id;
}

async function getSessionId(): Promise<string> {
  // Session storage is per-browser-session (cleared on close)
  const result = await browser.storage.session.get('ga4SessionId');
  if (result.ga4SessionId) return result.ga4SessionId as string;

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await browser.storage.session.set({ ga4SessionId: id });
  return id;
}

async function hasConsent(): Promise<boolean> {
  try {
    const prefs = await userPreferences.getValue();
    return prefs.analyticsConsent;
  } catch {
    return false;
  }
}

function getEndpoint(): string {
  const base = import.meta.env.DEV ? DEBUG_URL : COLLECT_URL;
  return `${base}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;
}

function isConfigured(): boolean {
  return MEASUREMENT_ID !== '' && API_SECRET !== '';
}

/**
 * Send one or more events to GA4 via Measurement Protocol.
 * Silently no-ops if consent not granted or credentials not configured.
 */
export async function sendGA4Events(events: GA4Event[]): Promise<void> {
  if (!isConfigured()) return;
  if (!(await hasConsent())) return;

  const clientId = await getClientId();
  const sessionId = await getSessionId();

  const enrichedEvents = events.map((event) => ({
    ...event,
    params: {
      session_id: sessionId,
      engagement_time_msec: 100,
      ...event.params,
    },
  }));

  const payload: GA4Payload = {
    client_id: clientId,
    events: enrichedEvents,
    user_properties: {
      extension_version: { value: browser.runtime.getManifest().version },
    },
  };

  try {
    await fetch(getEndpoint(), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch {
    // Analytics failures are non-critical — silently ignore
  }
}

/**
 * Send a single event to GA4.
 */
export async function sendGA4Event(
  name: string,
  params: Record<string, string | number> = {},
): Promise<void> {
  return sendGA4Events([{ name, params }]);
}
