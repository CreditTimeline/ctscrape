import type { NormalisationContext } from '../context';

/**
 * Organisations are populated by the tradelines and searches stages
 * via registerOrganisation(). This stage is a no-op placeholder
 * for pipeline consistency.
 */
export function normaliseOrganisations(_ctx: NormalisationContext): void {
  // Organisations are registered during tradeline and search processing.
  // Nothing to do here.
}
