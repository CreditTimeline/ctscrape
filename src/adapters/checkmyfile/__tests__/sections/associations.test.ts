// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { extractAssociations } from '../../sections/associations';
import { classifySections } from '../../section-classifier';
import {
  createSection,
  createCraHeaderRow,
  createCraTableRow,
  randomName,
  randomDate,
  randomLender,
} from '../fixtures/helpers';
import { SELECTORS, NO_DATA_SENTINEL } from '../../constants';
import type { ClassifiedSection } from '../../section-classifier';

function buildAssociationTable(
  heading: string,
  data: {
    Experian?: Record<string, string>;
    Equifax?: Record<string, string>;
    TransUnion?: Record<string, string>;
  },
): string {
  const wrapper = document.createElement('div');

  const h2 = document.createElement('h2');
  h2.setAttribute('data-testid', SELECTORS.ASSOCIATIONS_TABLE_HEADING);
  h2.textContent = heading;
  wrapper.appendChild(h2);

  const table = document.createElement('table');
  table.setAttribute('data-testid', SELECTORS.ASSOCIATIONS_TABLE);

  const thead = document.createElement('thead');
  thead.appendChild(createCraHeaderRow());
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const fieldSlugs = [
    'associated-to',
    'date-of-birth',
    'created-by',
    'created-on',
    'confirmed-by',
    'last-confirmed',
  ];
  const fieldLabels = [
    'Associated To',
    'Date of Birth',
    'Created By',
    'Created On',
    'Confirmed By',
    'Last Confirmed',
  ];

  for (let i = 0; i < fieldSlugs.length; i++) {
    const slug = fieldSlugs[i]!;
    const label = fieldLabels[i]!;
    tbody.appendChild(
      createCraTableRow(slug, label, {
        Experian: data.Experian?.[slug],
        Equifax: data.Equifax?.[slug],
        TransUnion: data.TransUnion?.[slug],
      }),
    );
  }

  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper.outerHTML;
}

function buildSections(content: string): ClassifiedSection[] {
  const section = createSection({ heading: 'Associations', content });
  document.body.innerHTML = '';
  document.body.appendChild(section);
  return classifySections(document);
}

describe('extractAssociations', () => {
  it('extracts association data for each CRA present', () => {
    const expName = randomName();
    const eqName = randomName();
    const tuName = randomName();
    const expDob = randomDate();
    const eqDob = randomDate();
    const tuDob = randomDate();
    const expCreatedBy = randomLender();
    const eqCreatedBy = randomLender();

    const html = buildAssociationTable('Association with Mr John Smith', {
      Experian: {
        'associated-to': expName,
        'date-of-birth': expDob,
        'created-by': expCreatedBy,
        'created-on': randomDate(),
        'confirmed-by': expCreatedBy,
        'last-confirmed': randomDate(),
      },
      Equifax: {
        'associated-to': eqName,
        'date-of-birth': eqDob,
        'created-by': eqCreatedBy,
        'created-on': randomDate(),
        'confirmed-by': eqCreatedBy,
        'last-confirmed': randomDate(),
      },
      TransUnion: {
        'associated-to': tuName,
        'date-of-birth': tuDob,
        'created-by': randomLender(),
        'created-on': randomDate(),
        'confirmed-by': randomLender(),
        'last-confirmed': randomDate(),
      },
    });

    const sections = buildSections(html);
    const result = extractAssociations(sections);

    expect(result).toHaveLength(3);

    const expSection = result.find((s) => s.sourceSystem === 'Experian')!;
    expect(expSection.domain).toBe('financial_associates');
    expect(expSection.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'associated-to',
          value: expName,
          groupKey: 'assoc-0-Experian',
          confidence: 'high',
        }),
        expect.objectContaining({
          name: 'date-of-birth',
          value: expDob,
          groupKey: 'assoc-0-Experian',
        }),
        expect.objectContaining({
          name: 'heading',
          value: 'Association with Mr John Smith',
          groupKey: 'assoc-0-Experian',
        }),
      ]),
    );

    const eqSection = result.find((s) => s.sourceSystem === 'Equifax')!;
    expect(eqSection.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'associated-to',
          value: eqName,
          groupKey: 'assoc-0-Equifax',
        }),
      ]),
    );

    const tuSection = result.find((s) => s.sourceSystem === 'TransUnion')!;
    expect(tuSection.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'associated-to',
          value: tuName,
          groupKey: 'assoc-0-TransUnion',
        }),
      ]),
    );
  });

  it('skips CRAs with sentinel text in associated-to', () => {
    const expName = randomName();

    const html = buildAssociationTable('Association', {
      Experian: {
        'associated-to': expName,
        'date-of-birth': randomDate(),
        'created-by': randomLender(),
        'created-on': randomDate(),
        'confirmed-by': randomLender(),
        'last-confirmed': randomDate(),
      },
      Equifax: {
        'associated-to': NO_DATA_SENTINEL,
        'date-of-birth': NO_DATA_SENTINEL,
        'created-by': NO_DATA_SENTINEL,
        'created-on': NO_DATA_SENTINEL,
        'confirmed-by': NO_DATA_SENTINEL,
        'last-confirmed': NO_DATA_SENTINEL,
      },
      TransUnion: {
        'associated-to': NO_DATA_SENTINEL,
        'date-of-birth': NO_DATA_SENTINEL,
        'created-by': NO_DATA_SENTINEL,
        'created-on': NO_DATA_SENTINEL,
        'confirmed-by': NO_DATA_SENTINEL,
        'last-confirmed': NO_DATA_SENTINEL,
      },
    });

    const sections = buildSections(html);
    const result = extractAssociations(sections);

    expect(result).toHaveLength(1);
    expect(result[0]!.sourceSystem).toBe('Experian');
    expect(result[0]!.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'associated-to',
          value: expName,
        }),
      ]),
    );
  });

  it('handles empty sections', () => {
    const sections = buildSections('');
    const result = extractAssociations(sections);
    expect(result).toHaveLength(0);
  });

  it('handles multiple association tables', () => {
    const name1 = randomName();
    const name2 = randomName();

    const sentinel = NO_DATA_SENTINEL;
    const noData = {
      'associated-to': sentinel,
      'date-of-birth': sentinel,
      'created-by': sentinel,
      'created-on': sentinel,
      'confirmed-by': sentinel,
      'last-confirmed': sentinel,
    };

    const html =
      buildAssociationTable('Association 1', {
        Experian: {
          'associated-to': name1,
          'date-of-birth': randomDate(),
          'created-by': randomLender(),
          'created-on': randomDate(),
          'confirmed-by': randomLender(),
          'last-confirmed': randomDate(),
        },
        Equifax: noData,
        TransUnion: noData,
      }) +
      buildAssociationTable('Association 2', {
        Experian: noData,
        Equifax: {
          'associated-to': name2,
          'date-of-birth': randomDate(),
          'created-by': randomLender(),
          'created-on': randomDate(),
          'confirmed-by': randomLender(),
          'last-confirmed': randomDate(),
        },
        TransUnion: noData,
      });

    const sections = buildSections(html);
    const result = extractAssociations(sections);

    expect(result).toHaveLength(2);

    const first = result.find((s) => s.sourceSystem === 'Experian')!;
    expect(first.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'associated-to',
          value: name1,
          groupKey: 'assoc-0-Experian',
        }),
      ]),
    );

    const second = result.find((s) => s.sourceSystem === 'Equifax')!;
    expect(second.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'associated-to',
          value: name2,
          groupKey: 'assoc-1-Equifax',
        }),
      ]),
    );
  });

  it('ignores non-association sections', () => {
    const section = createSection({ heading: 'Aliases' });
    document.body.innerHTML = '';
    document.body.appendChild(section);
    const sections = classifySections(document);
    const result = extractAssociations(sections);
    expect(result).toHaveLength(0);
  });
});
