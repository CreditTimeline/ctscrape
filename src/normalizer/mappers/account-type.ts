import type { TradelineAccountType } from '../data/enums';
import type { NormalisationWarning } from '../types';
import { ACCOUNT_TYPE_MAP } from '../data/normalization-rules';

export interface AccountTypeResult {
  accountType: TradelineAccountType;
  warning?: NormalisationWarning;
}

export function mapAccountType(rawType: string, sourceSystem: string): AccountTypeResult {
  const craMap = ACCOUNT_TYPE_MAP[sourceSystem];
  if (craMap) {
    const mapped = craMap[rawType.toLowerCase().trim()];
    if (mapped) return { accountType: mapped };
  }
  // Try all CRAs as fallback
  for (const map of Object.values(ACCOUNT_TYPE_MAP)) {
    const mapped = map[rawType.toLowerCase().trim()];
    if (mapped) return { accountType: mapped };
  }
  return {
    accountType: 'other',
    warning: {
      domain: 'tradelines',
      field: 'account_type',
      message: `Unknown account type "${rawType}" for ${sourceSystem}, defaulting to "other"`,
      severity: 'warning',
    },
  };
}
