import type { AddressAssociationRole } from '../data/enums';
import { ADDRESS_ROLE_MAP } from '../data/normalization-rules';

export function mapAddressRole(
  headingContext: string | undefined,
  sourceSystem: string,
  tableIndex: number,
): AddressAssociationRole {
  if (headingContext) {
    const lower = headingContext.toLowerCase().trim();
    const craMap = ADDRESS_ROLE_MAP[sourceSystem];
    if (craMap) {
      for (const [key, role] of Object.entries(craMap)) {
        if (lower.includes(key)) return role;
      }
    }
    // Check generic map
    const genericMap = ADDRESS_ROLE_MAP['generic'];
    if (genericMap) {
      for (const [key, role] of Object.entries(genericMap)) {
        if (lower.includes(key)) return role;
      }
    }
  }
  // Position heuristic: first address is usually current
  if (tableIndex === 0) return 'current';
  return 'previous';
}
