import type { RawSection, RawField, DataDomain } from '@/adapters/types';

export interface FieldGroup {
  sourceSystem: string | null;
  fields: Map<string, RawField>;
}

/**
 * Group fields from sections matching a domain by their groupKey.
 * Returns a Map of groupKey → FieldGroup where each group contains
 * a field-name → RawField lookup.
 */
export function groupFieldsByGroupKey(
  sections: RawSection[],
  domain: DataDomain,
): Map<string, FieldGroup> {
  const groups = new Map<string, FieldGroup>();

  for (const section of sections) {
    if (section.domain !== domain) continue;

    for (const field of section.fields) {
      const key = field.groupKey ?? '__ungrouped__';

      let group = groups.get(key);
      if (!group) {
        group = { sourceSystem: section.sourceSystem, fields: new Map() };
        groups.set(key, group);
      }

      group.fields.set(field.name, field);
    }
  }

  return groups;
}
