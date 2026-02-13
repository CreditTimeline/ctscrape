import { defineExtensionMessaging } from '@webext-core/messaging';
import type { PageInfo, RawExtractedData } from '../adapters/types';
import type { NormalisationResult } from '../normalizer/types';

/**
 * Type-safe messaging protocol between extension contexts.
 *
 * Content script ↔ Background (service worker) ↔ Popup/Sidepanel
 */
interface ProtocolMap {
  /** Content script detected a supported report page */
  pageDetected(data: { pageInfo: PageInfo }): void;

  /** Content script reports page is no longer a report (e.g., navigated away) */
  pageLeft(): void;

  /** Background requests content script to perform full extraction */
  extractRequest(): void;

  /** Content script returns extracted data */
  extractResult(data: { rawData: RawExtractedData }): void;

  /** Content script reports extraction failure */
  extractError(data: { error: string; details?: string }): void;

  /** Background has finished normalisation — data ready for review */
  normaliseComplete(data: { result: NormalisationResult }): void;

  /** User approved sending data to ctview */
  sendToCtview(): void;

  /** Background reports send result */
  sendResult(data: { success: boolean; receiptId?: string; error?: string }): void;

  /** Popup/sidepanel requests extraction via background (not direct to content) */
  triggerExtract(): void;

  /** Popup/sidepanel requests current extension state */
  getStatus(): ExtensionStatus;
}

/** Current state of the extension, returned by getStatus */
export interface ExtensionStatus {
  state: 'idle' | 'detected' | 'extracting' | 'normalising' | 'ready' | 'sending' | 'complete' | 'error';
  pageInfo?: PageInfo;
  result?: NormalisationResult;
  lastError?: string;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
