// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { extractSearches } from '../../sections/searches';
import { classifySections } from '../../section-classifier';
import {
  createSection,
  createSearchCard,
  randomName,
  randomAddress,
  randomSlashDate,
  randomLender,
} from '../fixtures/helpers';
import type { ClassifiedSection } from '../../section-classifier';

function buildSearchSection(
  type: 'Hard Searches' | 'Soft Searches',
  cards: HTMLElement[],
): ClassifiedSection[] {
  const content = document.createElement('div');
  for (const card of cards) {
    content.appendChild(card);
  }

  const section = createSection({
    heading: type,
    content: content.innerHTML,
  });
  document.body.innerHTML = '';
  document.body.appendChild(section);
  return classifySections(document);
}

describe('extractSearches', () => {
  it('extracts hard search data for each card', () => {
    const company1 = randomLender();
    const name1 = randomName();
    const address1 = randomAddress();
    const date1 = randomSlashDate();

    const company2 = randomLender();
    const name2 = randomName();
    const address2 = randomAddress();
    const date2 = randomSlashDate();

    const card1 = createSearchCard({
      cra: 'Experian',
      date: date1,
      company: company1,
      name: name1,
      address: address1,
    });

    const card2 = createSearchCard({
      cra: 'Equifax',
      date: date2,
      company: company2,
      name: name2,
      address: address2,
    });

    const sections = buildSearchSection('Hard Searches', [card1, card2]);
    const result = extractSearches(sections);

    expect(result).toHaveLength(2);

    const first = result[0]!;
    expect(first.domain).toBe('searches');
    expect(first.sourceSystem).toBe('Experian');
    expect(first.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'search_type',
          value: 'hard',
          groupKey: 'search-hard-0',
        }),
        expect.objectContaining({ name: 'date', value: date1 }),
        expect.objectContaining({ name: 'company', value: company1 }),
        expect.objectContaining({ name: 'name', value: name1 }),
        expect.objectContaining({ name: 'address', value: address1 }),
      ]),
    );

    const second = result[1]!;
    expect(second.sourceSystem).toBe('Equifax');
    expect(second.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'search_type',
          value: 'hard',
          groupKey: 'search-hard-1',
        }),
        expect.objectContaining({ name: 'company', value: company2 }),
      ]),
    );
  });

  it('extracts soft search data', () => {
    const company = randomLender();
    const name = randomName();
    const address = randomAddress();
    const date = randomSlashDate();

    const card = createSearchCard({
      cra: 'TransUnion',
      date,
      company,
      name,
      address,
    });

    const sections = buildSearchSection('Soft Searches', [card]);
    const result = extractSearches(sections);

    expect(result).toHaveLength(1);
    expect(result[0]!.domain).toBe('searches');
    expect(result[0]!.sourceSystem).toBe('TransUnion');
    expect(result[0]!.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'search_type',
          value: 'soft',
          groupKey: 'search-soft-0',
        }),
        expect.objectContaining({ name: 'date', value: date }),
        expect.objectContaining({ name: 'company', value: company }),
      ]),
    );
  });

  it('handles empty sections', () => {
    const section = createSection({ heading: 'Hard Searches' });
    document.body.innerHTML = '';
    document.body.appendChild(section);
    const sections = classifySections(document);
    const result = extractSearches(sections);
    expect(result).toHaveLength(0);
  });

  it('has correct groupKey values with sequential card indices', () => {
    const cards = [
      createSearchCard({
        cra: 'Experian',
        date: randomSlashDate(),
        company: randomLender(),
        name: randomName(),
        address: randomAddress(),
      }),
      createSearchCard({
        cra: 'Equifax',
        date: randomSlashDate(),
        company: randomLender(),
        name: randomName(),
        address: randomAddress(),
      }),
      createSearchCard({
        cra: 'TransUnion',
        date: randomSlashDate(),
        company: randomLender(),
        name: randomName(),
        address: randomAddress(),
      }),
    ];

    const sections = buildSearchSection('Hard Searches', cards);
    const result = extractSearches(sections);

    expect(result).toHaveLength(3);
    expect(result[0]!.fields[0]!.groupKey).toBe('search-hard-0');
    expect(result[1]!.fields[0]!.groupKey).toBe('search-hard-1');
    expect(result[2]!.fields[0]!.groupKey).toBe('search-hard-2');
  });

  it('ignores non-search sections', () => {
    const section = createSection({ heading: 'Aliases' });
    document.body.innerHTML = '';
    document.body.appendChild(section);
    const sections = classifySections(document);
    const result = extractSearches(sections);
    expect(result).toHaveLength(0);
  });
});
