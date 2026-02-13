import type { SearchType, SearchVisibility } from '../data/enums';
import type { NormalisationWarning } from '../types';

export interface SearchTypeResult {
  searchType: SearchType;
  visibility: SearchVisibility;
  warning?: NormalisationWarning;
}

/** Map from CheckMyFile's hard/soft section classification */
export function mapCheckMyFileSearchType(sectionType: 'hard' | 'soft'): SearchTypeResult {
  if (sectionType === 'hard') {
    return {
      searchType: 'credit_application',
      visibility: 'hard',
      warning: {
        domain: 'searches',
        field: 'search_type',
        message: 'Search type inferred as "credit_application" from hard search section; actual type may differ',
        severity: 'info',
      },
    };
  }
  return {
    searchType: 'other',
    visibility: 'soft',
    warning: {
      domain: 'searches',
      field: 'search_type',
      message: 'Search type set to "other" from soft search section; actual type may differ',
      severity: 'info',
    },
  };
}
