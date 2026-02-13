import type { NormalisationWarning } from '../types';
import { ACCOUNT_STATUS_MAP } from '../data/normalization-rules';

export interface AccountStatusResult {
  canonicalStatus: string;
  isClosed: boolean;
  adverseFlag: boolean;
  warning?: NormalisationWarning;
}

export function mapAccountStatus(rawStatus: string, sourceSystem: string): AccountStatusResult {
  const lower = rawStatus.toLowerCase().trim();
  const craMap = ACCOUNT_STATUS_MAP[sourceSystem];
  let canonical: string | undefined;
  if (craMap) canonical = craMap[lower];

  // Try all CRAs as fallback
  if (!canonical) {
    for (const map of Object.values(ACCOUNT_STATUS_MAP)) {
      canonical = map[lower];
      if (canonical) break;
    }
  }

  if (canonical) {
    return {
      canonicalStatus: canonical,
      isClosed: ['settled', 'satisfied'].includes(canonical),
      adverseFlag: ['defaulted', 'delinquent'].includes(canonical),
    };
  }

  // Common status text fallbacks
  if (lower.includes('default')) return { canonicalStatus: 'defaulted', isClosed: false, adverseFlag: true };
  if (lower.includes('settled') || lower.includes('closed')) return { canonicalStatus: 'settled', isClosed: true, adverseFlag: false };
  if (lower.includes('active') || lower.includes('up to date')) return { canonicalStatus: 'up_to_date', isClosed: false, adverseFlag: false };

  return {
    canonicalStatus: rawStatus,
    isClosed: false,
    adverseFlag: false,
    warning: {
      domain: 'tradelines',
      field: 'status',
      message: `Unknown account status "${rawStatus}" for ${sourceSystem}, preserving raw text`,
      severity: 'warning',
    },
  };
}
