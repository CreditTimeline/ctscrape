import type { NormalisationContext } from '../context';
import { nextCounter, getImportId } from '../context';
import { generateSequentialId } from '../id-generator';
import { groupFieldsByGroupKey } from '../field-grouper';
import { ELECTORAL_CHANGE_TYPE_MAP } from '../data/normalization-rules';
import type { ElectoralChangeType } from '../data/enums';
import type { RawSection } from '@/adapters/types';

export function normaliseElectoralRoll(ctx: NormalisationContext, sections: RawSection[]): void {
  const groups = groupFieldsByGroupKey(sections, 'electoral_roll');

  for (const [, group] of groups) {
    const electoralField = group.fields.get('electoral-roll');
    if (!electoralField) continue;

    // Find matching address from context (by shared groupKey or nearby address field)
    const addressField = group.fields.get('address');
    let addressId: string | undefined;
    if (addressField) {
      const normalized = addressField.value.toUpperCase().replace(/\s+/g, ' ');
      addressId = ctx.addressRegistry.get(normalized);
    }

    // Marketing status
    const marketingField = group.fields.get('marketing-status');
    let marketingOptOut: boolean | null = null;
    if (marketingField) {
      const lower = marketingField.value.toLowerCase();
      marketingOptOut = lower.includes('opted out') || lower.includes('no') || lower.includes('removed');
    }

    // Change type
    let changeType: ElectoralChangeType = 'unknown';
    const lower = electoralField.value.toLowerCase();
    for (const [key, value] of Object.entries(ELECTORAL_CHANGE_TYPE_MAP)) {
      if (lower.includes(key)) {
        changeType = value;
        break;
      }
    }
    // If just "Registered" with no change type context, default to 'added'
    if (changeType === 'unknown' && lower.includes('registered')) {
      changeType = 'added';
    }

    const entryId = generateSequentialId('er', nextCounter(ctx, 'er'));
    ctx.electoralRollEntries.push({
      electoral_entry_id: entryId,
      ...(addressId && { address_id: addressId }),
      name_on_register: ctx.pageInfo.subjectName,
      change_type: changeType,
      marketing_opt_out: marketingOptOut,
      source_import_id: getImportId(ctx, group.sourceSystem),
    });
  }
}
