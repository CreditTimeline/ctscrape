import type { NormalisationContext } from '../context';
import { nextCounter, getImportId } from '../context';
import { generateSequentialId } from '../id-generator';
import { groupFieldsByGroupKey } from '../field-grouper';
import type { RawSection } from '@/adapters/types';
import { parseLongDate } from '@/utils/parsers';

export function normaliseSubject(ctx: NormalisationContext, sections: RawSection[]): void {
  // Primary name from PageInfo
  if (ctx.pageInfo.subjectName) {
    const nameId = generateSequentialId('name', nextCounter(ctx, 'name'));
    ctx.names.push({
      name_id: nameId,
      full_name: ctx.pageInfo.subjectName,
      name_type: 'legal',
      source_import_id: getImportId(ctx, null),
    });
  }

  // Aliases from personal_info sections
  const personalGroups = groupFieldsByGroupKey(sections, 'personal_info');
  for (const [, group] of personalGroups) {
    const aliasField = group.fields.get('alias-name');
    if (aliasField && aliasField.value !== ctx.pageInfo.subjectName) {
      const nameId = generateSequentialId('name', nextCounter(ctx, 'name'));
      ctx.names.push({
        name_id: nameId,
        full_name: aliasField.value,
        name_type: 'alias',
        source_import_id: getImportId(ctx, group.sourceSystem),
      });
    }
  }

  // DOBs from tradeline date-of-birth fields
  const dobSet = new Set<string>();
  const tradelineGroups = groupFieldsByGroupKey(sections, 'tradelines');
  for (const [, group] of tradelineGroups) {
    const dobField = group.fields.get('date-of-birth');
    if (dobField) {
      const parsed = parseLongDate(dobField.value);
      if (parsed && !dobSet.has(parsed)) {
        dobSet.add(parsed);
        ctx.datesOfBirth.push({
          dob: parsed,
          source_import_id: getImportId(ctx, group.sourceSystem),
        });
      }
    }
  }
}
