import type { CanonicalPaymentStatus } from '../data/enums';
import type { NormalisationWarning } from '../types';
import { CHECKMYFILE_PAYMENT_STATUS_MAP, PAYMENT_STATUS_MAP } from '../data/normalization-rules';

export interface PaymentStatusResult {
  canonicalStatus: CanonicalPaymentStatus;
  warning?: NormalisationWarning;
}

/** Map CheckMyFile descriptive text (e.g. "Clean Payment") to canonical status */
export function mapCheckMyFilePaymentStatus(text: string): PaymentStatusResult {
  const mapped = CHECKMYFILE_PAYMENT_STATUS_MAP[text.trim()];
  if (mapped) return { canonicalStatus: mapped };
  return {
    canonicalStatus: 'unknown',
    warning: {
      domain: 'tradelines',
      field: 'payment_status',
      message: `Unknown CheckMyFile payment status "${text}", defaulting to "unknown"`,
      severity: 'warning',
    },
  };
}

/** Map CRA payment code (e.g. "0", "D") to canonical status (for future adapters) */
export function mapCraPaymentCode(code: string, sourceSystem: string): PaymentStatusResult {
  const craMap = PAYMENT_STATUS_MAP[sourceSystem];
  if (craMap) {
    const mapped = craMap[code.trim()];
    if (mapped) return { canonicalStatus: mapped };
  }
  return {
    canonicalStatus: 'unknown',
    warning: {
      domain: 'tradelines',
      field: 'payment_status',
      message: `Unknown payment code "${code}" for ${sourceSystem}`,
      severity: 'warning',
    },
  };
}
