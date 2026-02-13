import { describe, it, expect } from 'vitest';
import { groupFieldsByGroupKey } from '../field-grouper';
import type { RawSection, RawField } from '@/adapters/types';

function makeField(
  name: string,
  value: string,
  groupKey?: string,
  confidence: RawField['confidence'] = 'high',
): RawField {
  return { name, value, groupKey, confidence };
}

function makeSection(
  domain: RawSection['domain'],
  sourceSystem: string | null,
  fields: RawField[],
): RawSection {
  return { domain, sourceSystem, fields };
}

describe('groupFieldsByGroupKey', () => {
  it('filters sections by domain', () => {
    const sections: RawSection[] = [
      makeSection('tradelines', 'Equifax', [
        makeField('balance', '£500', 'tl-1'),
      ]),
      makeSection('addresses', null, [
        makeField('address', '123 Main St', 'addr-1'),
      ]),
    ];

    const groups = groupFieldsByGroupKey(sections, 'tradelines');
    expect(groups.size).toBe(1);
    expect(groups.has('tl-1')).toBe(true);
  });

  it('groups fields by groupKey', () => {
    const sections: RawSection[] = [
      makeSection('tradelines', 'Equifax', [
        makeField('balance', '£500', 'tl-1'),
        makeField('limit', '£2000', 'tl-1'),
        makeField('balance', '£300', 'tl-2'),
      ]),
    ];

    const groups = groupFieldsByGroupKey(sections, 'tradelines');
    expect(groups.size).toBe(2);
    expect(groups.get('tl-1')!.fields.size).toBe(2);
    expect(groups.get('tl-2')!.fields.size).toBe(1);
  });

  it('puts fields without groupKey into __ungrouped__', () => {
    const sections: RawSection[] = [
      makeSection('personal_info', null, [
        makeField('full_name', 'John Doe'),
        makeField('dob', '1990-01-15'),
      ]),
    ];

    const groups = groupFieldsByGroupKey(sections, 'personal_info');
    expect(groups.size).toBe(1);
    expect(groups.has('__ungrouped__')).toBe(true);
    expect(groups.get('__ungrouped__')!.fields.size).toBe(2);
  });

  it('preserves sourceSystem from section', () => {
    const sections: RawSection[] = [
      makeSection('tradelines', 'TransUnion', [
        makeField('balance', '£100', 'tl-1'),
      ]),
    ];

    const groups = groupFieldsByGroupKey(sections, 'tradelines');
    expect(groups.get('tl-1')!.sourceSystem).toBe('TransUnion');
  });

  it('preserves null sourceSystem', () => {
    const sections: RawSection[] = [
      makeSection('personal_info', null, [
        makeField('full_name', 'Jane Doe', 'person-1'),
      ]),
    ];

    const groups = groupFieldsByGroupKey(sections, 'personal_info');
    expect(groups.get('person-1')!.sourceSystem).toBeNull();
  });

  it('maps field name to RawField correctly', () => {
    const sections: RawSection[] = [
      makeSection('tradelines', 'Experian', [
        makeField('balance', '£750', 'tl-1'),
      ]),
    ];

    const groups = groupFieldsByGroupKey(sections, 'tradelines');
    const field = groups.get('tl-1')!.fields.get('balance')!;
    expect(field.name).toBe('balance');
    expect(field.value).toBe('£750');
    expect(field.groupKey).toBe('tl-1');
    expect(field.confidence).toBe('high');
  });

  it('returns empty map when no sections match domain', () => {
    const sections: RawSection[] = [
      makeSection('addresses', null, [
        makeField('address', '456 Oak Ave', 'addr-1'),
      ]),
    ];

    const groups = groupFieldsByGroupKey(sections, 'tradelines');
    expect(groups.size).toBe(0);
  });

  it('merges fields from multiple sections with same domain', () => {
    const sections: RawSection[] = [
      makeSection('tradelines', 'Equifax', [
        makeField('balance', '£500', 'tl-1'),
      ]),
      makeSection('tradelines', 'Experian', [
        makeField('balance', '£510', 'tl-2'),
      ]),
    ];

    const groups = groupFieldsByGroupKey(sections, 'tradelines');
    expect(groups.size).toBe(2);
    expect(groups.get('tl-1')!.sourceSystem).toBe('Equifax');
    expect(groups.get('tl-2')!.sourceSystem).toBe('Experian');
  });
});
