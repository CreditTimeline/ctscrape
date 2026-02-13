import type { SourceSystem } from '../data/enums';

export function mapSourceSystem(raw: string): SourceSystem {
  const lower = raw.toLowerCase().trim();
  if (lower === 'experian') return 'experian';
  if (lower === 'equifax') return 'equifax';
  if (lower === 'transunion') return 'transunion';
  return 'other';
}
