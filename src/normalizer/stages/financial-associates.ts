import type { NormalisationContext } from '../context';
import { nextCounter, getImportId } from '../context';
import { generateSequentialId } from '../id-generator';
import { groupFieldsByGroupKey } from '../field-grouper';
import { parseLongDate, parseSlashDate } from '@/utils/parsers';
import type { RawSection } from '@/adapters/types';

export function normaliseFinancialAssociates(ctx: NormalisationContext, sections: RawSection[]): void {
  const groups = groupFieldsByGroupKey(sections, 'financial_associates');

  for (const [, group] of groups) {
    const nameField = group.fields.get('associated-to');
    if (!nameField) continue;

    // Parse confirmed date
    const lastConfirmedField = group.fields.get('last-confirmed');
    const createdOnField = group.fields.get('created-on');
    const dateField = lastConfirmedField ?? createdOnField;
    let confirmedAt: string | undefined;
    if (dateField) {
      confirmedAt = parseLongDate(dateField.value) ?? parseSlashDate(dateField.value) ?? undefined;
    }

    const assocId = generateSequentialId('fa', nextCounter(ctx, 'fa'));
    ctx.financialAssociates.push({
      associate_id: assocId,
      associate_name: nameField.value,
      relationship_basis: 'other',
      status: 'active',
      ...(confirmedAt && { confirmed_at: confirmedAt }),
      source_import_id: getImportId(ctx, group.sourceSystem),
    });
  }
}
