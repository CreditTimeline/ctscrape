import { describe, it, expect } from 'vitest';
import { mapAccountType } from '../../mappers/account-type';

describe('mapAccountType', () => {
  it('maps known equifax types correctly', () => {
    expect(mapAccountType('credit card', 'equifax').accountType).toBe('credit_card');
    expect(mapAccountType('mortgage', 'equifax').accountType).toBe('mortgage');
    expect(mapAccountType('loan', 'equifax').accountType).toBe('unsecured_loan');
    expect(mapAccountType('current account', 'equifax').accountType).toBe('current_account');
    expect(mapAccountType('communications supplier', 'equifax').accountType).toBe('telecom');
    expect(mapAccountType('utilities agreements', 'equifax').accountType).toBe('utility');
    expect(mapAccountType('property rental', 'equifax').accountType).toBe('rental');
    expect(mapAccountType('budget card / revolving credit', 'equifax').accountType).toBe('budget_account');
  });

  it('maps known transunion types correctly', () => {
    expect(mapAccountType('credit card', 'transunion').accountType).toBe('credit_card');
    expect(mapAccountType('mortgage (unspecified type)', 'transunion').accountType).toBe('mortgage');
    expect(mapAccountType('unsecured loan', 'transunion').accountType).toBe('unsecured_loan');
    expect(mapAccountType('current account', 'transunion').accountType).toBe('current_account');
    expect(mapAccountType('telecommunications supplier', 'transunion').accountType).toBe('telecom');
    expect(mapAccountType('utility', 'transunion').accountType).toBe('utility');
    expect(mapAccountType('budget account', 'transunion').accountType).toBe('budget_account');
  });

  it('performs case-insensitive matching', () => {
    expect(mapAccountType('Credit Card', 'equifax').accountType).toBe('credit_card');
    expect(mapAccountType('MORTGAGE', 'equifax').accountType).toBe('mortgage');
    expect(mapAccountType('  loan  ', 'equifax').accountType).toBe('unsecured_loan');
  });

  it('returns "other" with warning for unknown types', () => {
    const result = mapAccountType('store card', 'equifax');
    expect(result.accountType).toBe('other');
    expect(result.warning).toBeDefined();
    expect(result.warning!.domain).toBe('tradelines');
    expect(result.warning!.field).toBe('account_type');
    expect(result.warning!.severity).toBe('warning');
    expect(result.warning!.message).toContain('store card');
  });

  it('falls back to other CRAs when source CRA has no match', () => {
    // "utility" is in transunion but not equifax (equifax uses "utilities agreements")
    const result = mapAccountType('utility', 'equifax');
    expect(result.accountType).toBe('utility');
    expect(result.warning).toBeUndefined();
  });

  it('returns no warning for successful mappings', () => {
    const result = mapAccountType('credit card', 'equifax');
    expect(result.warning).toBeUndefined();
  });
});
