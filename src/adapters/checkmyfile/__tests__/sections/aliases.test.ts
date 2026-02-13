// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { extractAliases } from '../../sections/aliases';
import { classifySections } from '../../section-classifier';
import {
  createSection,
  createCraHeaderRow,
  createCraTableRow,
  randomName,
} from '../fixtures/helpers';
import { SELECTORS, NO_DATA_SENTINEL } from '../../constants';
import type { ClassifiedSection } from '../../section-classifier';

function buildAliasTable(
  heading: string,
  values: { Experian?: string; Equifax?: string; TransUnion?: string },
): string {
  const wrapper = document.createElement('div');

  const h2 = document.createElement('h2');
  h2.setAttribute('data-testid', SELECTORS.ALIASES_TABLE_HEADING);
  h2.textContent = heading;
  wrapper.appendChild(h2);

  const table = document.createElement('table');
  table.setAttribute('data-testid', SELECTORS.ALIASES_TABLE);

  const thead = document.createElement('thead');
  thead.appendChild(createCraHeaderRow());
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  tbody.appendChild(createCraTableRow('alias-name', 'Alias Name', values));
  table.appendChild(tbody);

  wrapper.appendChild(table);
  return wrapper.outerHTML;
}

function buildSections(content: string): ClassifiedSection[] {
  const section = createSection({ heading: 'Aliases', content });
  document.body.innerHTML = '';
  document.body.appendChild(section);
  return classifySections(document);
}

describe('extractAliases', () => {
  it('extracts alias data for each CRA present', () => {
    const expName = randomName();
    const eqName = randomName();
    const tuName = randomName();

    const html = buildAliasTable('Alias of Mr John Smith', {
      Experian: expName,
      Equifax: eqName,
      TransUnion: tuName,
    });

    const sections = buildSections(html);
    const result = extractAliases(sections);

    expect(result).toHaveLength(3);

    const expSection = result.find((s) => s.sourceSystem === 'Experian')!;
    expect(expSection.domain).toBe('personal_info');
    expect(expSection.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'alias_name',
          value: expName,
          groupKey: 'alias-0-Experian',
          confidence: 'high',
        }),
        expect.objectContaining({
          name: 'heading',
          value: 'Alias of Mr John Smith',
          groupKey: 'alias-0-Experian',
        }),
      ]),
    );

    const eqSection = result.find((s) => s.sourceSystem === 'Equifax')!;
    expect(eqSection.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'alias_name',
          value: eqName,
          groupKey: 'alias-0-Equifax',
        }),
      ]),
    );

    const tuSection = result.find((s) => s.sourceSystem === 'TransUnion')!;
    expect(tuSection.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'alias_name',
          value: tuName,
          groupKey: 'alias-0-TransUnion',
        }),
      ]),
    );
  });

  it('skips CRAs with sentinel text', () => {
    const expName = randomName();

    const html = buildAliasTable('Alias of Mr Test', {
      Experian: expName,
      Equifax: NO_DATA_SENTINEL,
      TransUnion: NO_DATA_SENTINEL,
    });

    const sections = buildSections(html);
    const result = extractAliases(sections);

    expect(result).toHaveLength(1);
    expect(result[0]!.sourceSystem).toBe('Experian');
    expect(result[0]!.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'alias_name', value: expName }),
      ]),
    );
  });

  it('handles empty sections', () => {
    const sections = buildSections('');
    const result = extractAliases(sections);
    expect(result).toHaveLength(0);
  });

  it('handles multiple alias tables', () => {
    const name1 = randomName();
    const name2 = randomName();

    const html =
      buildAliasTable('Alias of Mr First', {
        Experian: name1,
        Equifax: NO_DATA_SENTINEL,
        TransUnion: NO_DATA_SENTINEL,
      }) +
      buildAliasTable('Alias of Ms Second', {
        Experian: NO_DATA_SENTINEL,
        Equifax: name2,
        TransUnion: NO_DATA_SENTINEL,
      });

    const sections = buildSections(html);
    const result = extractAliases(sections);

    expect(result).toHaveLength(2);

    const first = result.find((s) => s.sourceSystem === 'Experian')!;
    expect(first.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'alias_name',
          value: name1,
          groupKey: 'alias-0-Experian',
        }),
      ]),
    );

    const second = result.find((s) => s.sourceSystem === 'Equifax')!;
    expect(second.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'alias_name',
          value: name2,
          groupKey: 'alias-1-Equifax',
        }),
      ]),
    );
  });

  it('ignores non-alias sections', () => {
    const section = createSection({ heading: 'Addresses & Electoral Roll' });
    document.body.innerHTML = '';
    document.body.appendChild(section);
    const sections = classifySections(document);
    const result = extractAliases(sections);
    expect(result).toHaveLength(0);
  });
});
