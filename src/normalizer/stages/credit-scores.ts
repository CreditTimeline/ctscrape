import type { NormalisationContext } from '../context';
import { nextCounter, getImportId } from '../context';
import { generateSequentialId } from '../id-generator';
import { groupFieldsByGroupKey } from '../field-grouper';
import { parseLongDate } from '@/utils/parsers';
import type { RawSection } from '@/adapters/types';

export function normaliseCreditScores(ctx: NormalisationContext, sections: RawSection[]): void {
  const groups = groupFieldsByGroupKey(sections, 'credit_scores');

  for (const [, group] of groups) {
    const scoreField = group.fields.get('score');
    if (!scoreField) continue;

    const scoreValue = parseInt(scoreField.value, 10);
    if (isNaN(scoreValue)) {
      ctx.warnings.push({
        domain: 'credit_scores',
        field: 'score',
        message: `Could not parse score value: "${scoreField.value}"`,
        severity: 'warning',
      });
      continue;
    }

    // calculated_at from report date
    let calculatedAt: string | undefined;
    if (ctx.pageInfo.reportDate) {
      calculatedAt = parseLongDate(ctx.pageInfo.reportDate) ?? ctx.pageInfo.reportDate;
    }

    const scoreId = generateSequentialId('score', nextCounter(ctx, 'score'));
    ctx.creditScores.push({
      score_id: scoreId,
      score_type: 'credit_score',
      score_name: 'CheckMyFile',
      score_value: scoreValue,
      score_min: 0,
      score_max: 1000,
      ...(calculatedAt && { calculated_at: calculatedAt }),
      source_import_id: getImportId(ctx, null),
    });
  }
}
