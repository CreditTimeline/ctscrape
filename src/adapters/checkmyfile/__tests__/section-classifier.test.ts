// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { classifySections } from '../section-classifier';
import { SECTION_HEADINGS } from '../constants';
import { createSection } from './fixtures/helpers';

function buildPage(sections: HTMLElement[]): Document {
  const doc = document;
  // Clear body for each test
  doc.body.innerHTML = '';
  for (const section of sections) {
    doc.body.appendChild(section);
  }
  return doc;
}

describe('classifySections', () => {
  it('classifies a page with all section types', () => {
    const doc = buildPage([
      createSection({ introHeading: 'Your Credit Report' }),
      createSection({ heading: SECTION_HEADINGS.ACTIVE_ACCOUNTS }),
      createSection({ heading: SECTION_HEADINGS.CLOSED_ACCOUNTS }),
      createSection({ heading: SECTION_HEADINGS.ADDRESSES }),
      createSection({ heading: SECTION_HEADINGS.ASSOCIATIONS }),
      createSection({ heading: SECTION_HEADINGS.ALIASES }),
      createSection({ heading: SECTION_HEADINGS.HARD_SEARCHES }),
      createSection({ heading: SECTION_HEADINGS.SOFT_SEARCHES }),
    ]);

    const result = classifySections(doc);

    expect(result).toHaveLength(8);
    expect(result.map((r) => r.type)).toEqual([
      'intro',
      'active_accounts',
      'closed_accounts',
      'addresses',
      'associations',
      'aliases',
      'hard_searches',
      'soft_searches',
    ]);
    // Verify indices are sequential
    expect(result.map((r) => r.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    // Verify each result has an element reference
    for (const r of result) {
      expect(r.element).toBeInstanceOf(HTMLElement);
    }
  });

  it('inherits section type from the last heading', () => {
    const doc = buildPage([
      createSection({ introHeading: 'Your Credit Report' }),
      createSection({ heading: SECTION_HEADINGS.ACTIVE_ACCOUNTS }),
      createSection({}), // no heading — should inherit active_accounts
      createSection({}), // no heading — should still inherit active_accounts
      createSection({ heading: SECTION_HEADINGS.CLOSED_ACCOUNTS }),
      createSection({}), // no heading — should inherit closed_accounts
    ]);

    const result = classifySections(doc);

    expect(result).toHaveLength(6);
    expect(result.map((r) => r.type)).toEqual([
      'intro',
      'active_accounts',
      'active_accounts',
      'active_accounts',
      'closed_accounts',
      'closed_accounts',
    ]);
  });

  it('classifies a page with only the intro section', () => {
    const doc = buildPage([
      createSection({ introHeading: 'Your Credit Report' }),
    ]);

    const result = classifySections(doc);

    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('intro');
    expect(result[0]!.index).toBe(0);
  });

  it('returns an empty array for a page with no sections', () => {
    const doc = buildPage([]);

    const result = classifySections(doc);

    expect(result).toEqual([]);
  });

  it('marks sections with unrecognized headings as unknown', () => {
    const doc = buildPage([
      createSection({ heading: 'Some Unknown Section' }),
      createSection({}), // inherits unknown
    ]);

    const result = classifySections(doc);

    expect(result).toHaveLength(2);
    expect(result[0]!.type).toBe('unknown');
    expect(result[1]!.type).toBe('unknown');
  });

  it('handles sections before any heading as unknown', () => {
    const doc = buildPage([
      createSection({}), // no heading, no intro — unknown
      createSection({ heading: SECTION_HEADINGS.ADDRESSES }),
    ]);

    const result = classifySections(doc);

    expect(result).toHaveLength(2);
    expect(result[0]!.type).toBe('unknown');
    expect(result[1]!.type).toBe('addresses');
  });
});
