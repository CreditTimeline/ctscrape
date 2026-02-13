import { describe, it, expect } from 'vitest';
import { mapCheckMyFileSearchType } from '../../mappers/search-type';

describe('mapCheckMyFileSearchType', () => {
  it('maps hard to credit_application with hard visibility', () => {
    const result = mapCheckMyFileSearchType('hard');
    expect(result.searchType).toBe('credit_application');
    expect(result.visibility).toBe('hard');
  });

  it('maps soft to other with soft visibility', () => {
    const result = mapCheckMyFileSearchType('soft');
    expect(result.searchType).toBe('other');
    expect(result.visibility).toBe('soft');
  });

  it('emits info warning for hard searches', () => {
    const result = mapCheckMyFileSearchType('hard');
    expect(result.warning).toBeDefined();
    expect(result.warning!.domain).toBe('searches');
    expect(result.warning!.field).toBe('search_type');
    expect(result.warning!.severity).toBe('info');
    expect(result.warning!.message).toContain('credit_application');
  });

  it('emits info warning for soft searches', () => {
    const result = mapCheckMyFileSearchType('soft');
    expect(result.warning).toBeDefined();
    expect(result.warning!.domain).toBe('searches');
    expect(result.warning!.field).toBe('search_type');
    expect(result.warning!.severity).toBe('info');
    expect(result.warning!.message).toContain('other');
  });
});
