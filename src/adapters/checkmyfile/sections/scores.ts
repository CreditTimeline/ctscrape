import type { ClassifiedSection } from '../section-classifier';
import type { RawSection } from '../../types';
import { SELECTORS } from '../constants';
import { extractCellText } from '../parsers';

export function extractScores(sections: ClassifiedSection[]): RawSection[] {
  for (const section of sections) {
    if (section.type !== 'intro') continue;

    const scoreEl = section.element.querySelector(
      `[data-testid="${SELECTORS.SCORE}"]`,
    );
    const scoreText = extractCellText(scoreEl);
    if (!scoreText) continue;

    return [
      {
        domain: 'credit_scores',
        sourceSystem: null,
        fields: [
          {
            name: 'score',
            value: scoreText,
            groupKey: 'score-checkmyfile',
            confidence: 'high',
          },
        ],
      },
    ];
  }

  return [];
}
