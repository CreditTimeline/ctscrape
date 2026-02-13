// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { extractScores } from '../../sections/scores';
import type { ClassifiedSection } from '../../section-classifier';
import { createSection } from '../fixtures/helpers';
import { SELECTORS } from '../../constants';

function introWithScore(score: string): ClassifiedSection {
  const scoreDiv = `<div data-testid="${SELECTORS.SCORE}">${score}</div>`;
  const el = createSection({ introHeading: 'Your Credit Report', content: scoreDiv });
  document.body.appendChild(el);
  return { type: 'intro', element: el, index: 0 };
}

function introWithoutScore(): ClassifiedSection {
  const el = createSection({ introHeading: 'Your Credit Report', content: '<p>No score</p>' });
  document.body.appendChild(el);
  return { type: 'intro', element: el, index: 0 };
}

describe('extractScores', () => {
  it('extracts the score from the intro section', () => {
    const score = String(Math.floor(Math.random() * 500) + 500);
    const sections = [introWithScore(score)];
    const result = extractScores(sections);

    expect(result).toHaveLength(1);
    expect(result[0]!.domain).toBe('credit_scores');
    expect(result[0]!.sourceSystem).toBeNull();
    expect(result[0]!.fields).toHaveLength(1);
    expect(result[0]!.fields[0]).toEqual({
      name: 'score',
      value: score,
      groupKey: 'score-checkmyfile',
      confidence: 'high',
    });
  });

  it('returns empty array when there is no intro section', () => {
    const el = createSection({ heading: 'Payment History - Active Accounts' });
    document.body.appendChild(el);
    const sections: ClassifiedSection[] = [
      { type: 'active_accounts', element: el, index: 0 },
    ];

    expect(extractScores(sections)).toEqual([]);
  });

  it('returns empty array when intro has no score element', () => {
    const sections = [introWithoutScore()];
    expect(extractScores(sections)).toEqual([]);
  });

  it('returns empty array for empty sections list', () => {
    expect(extractScores([])).toEqual([]);
  });
});
