/**
 * Typed GA4 event factories for ctscrape.
 * Each function returns { name, params } for use with sendGA4Event/sendGA4Events.
 */

interface GA4Event {
  name: string;
  params: Record<string, string | number>;
}

// --- Lifecycle ---

export function extensionInstalled(): GA4Event {
  return { name: 'extension_installed', params: {} };
}

export function extensionUpdated(previousVersion: string): GA4Event {
  return { name: 'extension_updated', params: { previous_version: previousVersion } };
}

// --- Extraction Funnel ---

export function pageDetected(siteName: string): GA4Event {
  return { name: 'page_detected', params: { site_name: siteName } };
}

export function extractionStarted(adapterId: string): GA4Event {
  return { name: 'extraction_started', params: { adapter_id: adapterId } };
}

export function extractionCompleted(adapterId: string, entityCount: number): GA4Event {
  return { name: 'extraction_completed', params: { adapter_id: adapterId, entity_count: entityCount } };
}

export function extractionError(adapterId: string, error: string): GA4Event {
  return { name: 'extraction_error', params: { adapter_id: adapterId, error_message: error.slice(0, 100) } };
}

export function normalisationCompleted(success: boolean, errorCount: number, warningCount: number): GA4Event {
  return {
    name: 'normalisation_completed',
    params: { success: success ? 1 : 0, error_count: errorCount, warning_count: warningCount },
  };
}

// --- Sending ---

export function sendStarted(): GA4Event {
  return { name: 'send_started', params: {} };
}

export function sendCompleted(duplicate: boolean): GA4Event {
  return { name: 'send_completed', params: { duplicate: duplicate ? 1 : 0 } };
}

export function sendError(errorCode: string): GA4Event {
  return { name: 'send_error', params: { error_code: errorCode } };
}

// --- User Actions ---

export function connectionTested(success: boolean): GA4Event {
  return { name: 'connection_tested', params: { success: success ? 1 : 0 } };
}

export function retryAttempted(success: boolean): GA4Event {
  return { name: 'retry_attempted', params: { success: success ? 1 : 0 } };
}

export function settingsChanged(field: string): GA4Event {
  return { name: 'settings_changed', params: { field } };
}

export function supportBundleCreated(): GA4Event {
  return { name: 'support_bundle_created', params: {} };
}
