import { describe, it, expect } from 'vitest';
import { mapCheckMyFilePaymentStatus, mapCraPaymentCode } from '../../mappers/payment-status';

describe('mapCheckMyFilePaymentStatus', () => {
  it('maps all CheckMyFile text statuses correctly', () => {
    expect(mapCheckMyFilePaymentStatus('Clean Payment').canonicalStatus).toBe('up_to_date');
    expect(mapCheckMyFilePaymentStatus('Late Payment').canonicalStatus).toBe('in_arrears');
    expect(mapCheckMyFilePaymentStatus('Default').canonicalStatus).toBe('default');
    expect(mapCheckMyFilePaymentStatus('Arrangement').canonicalStatus).toBe('arrangement');
    expect(mapCheckMyFilePaymentStatus('Settled').canonicalStatus).toBe('settled');
    expect(mapCheckMyFilePaymentStatus('Query').canonicalStatus).toBe('query');
    expect(mapCheckMyFilePaymentStatus('Gone Away').canonicalStatus).toBe('gone_away');
    expect(mapCheckMyFilePaymentStatus('No Update').canonicalStatus).toBe('no_update');
    expect(mapCheckMyFilePaymentStatus('Written Off').canonicalStatus).toBe('written_off');
    expect(mapCheckMyFilePaymentStatus('Repossession').canonicalStatus).toBe('repossession');
    expect(mapCheckMyFilePaymentStatus('Transferred').canonicalStatus).toBe('transferred');
    expect(mapCheckMyFilePaymentStatus('Inactive').canonicalStatus).toBe('inactive');
  });

  it('returns no warning for known statuses', () => {
    expect(mapCheckMyFilePaymentStatus('Clean Payment').warning).toBeUndefined();
    expect(mapCheckMyFilePaymentStatus('Default').warning).toBeUndefined();
  });

  it('returns "unknown" with warning for unrecognised text', () => {
    const result = mapCheckMyFilePaymentStatus('Something Weird');
    expect(result.canonicalStatus).toBe('unknown');
    expect(result.warning).toBeDefined();
    expect(result.warning!.domain).toBe('tradelines');
    expect(result.warning!.field).toBe('payment_status');
    expect(result.warning!.message).toContain('Something Weird');
  });
});

describe('mapCraPaymentCode', () => {
  it('maps equifax codes correctly', () => {
    expect(mapCraPaymentCode('0', 'equifax').canonicalStatus).toBe('up_to_date');
    expect(mapCraPaymentCode('1', 'equifax').canonicalStatus).toBe('in_arrears');
    expect(mapCraPaymentCode('D', 'equifax').canonicalStatus).toBe('default');
    expect(mapCraPaymentCode('S', 'equifax').canonicalStatus).toBe('settled');
    expect(mapCraPaymentCode('.', 'equifax').canonicalStatus).toBe('no_update');
    expect(mapCraPaymentCode('W', 'equifax').canonicalStatus).toBe('written_off');
    expect(mapCraPaymentCode('R', 'equifax').canonicalStatus).toBe('repossession');
    expect(mapCraPaymentCode('Q', 'equifax').canonicalStatus).toBe('query');
    expect(mapCraPaymentCode('G', 'equifax').canonicalStatus).toBe('gone_away');
    expect(mapCraPaymentCode('I', 'equifax').canonicalStatus).toBe('arrangement');
  });

  it('maps transunion codes correctly', () => {
    expect(mapCraPaymentCode('0', 'transunion').canonicalStatus).toBe('up_to_date');
    expect(mapCraPaymentCode('1', 'transunion').canonicalStatus).toBe('in_arrears');
    expect(mapCraPaymentCode('D', 'transunion').canonicalStatus).toBe('default');
    expect(mapCraPaymentCode('S', 'transunion').canonicalStatus).toBe('settled');
    expect(mapCraPaymentCode('U', 'transunion').canonicalStatus).toBe('no_update');
    expect(mapCraPaymentCode('?', 'transunion').canonicalStatus).toBe('unknown');
    expect(mapCraPaymentCode('Q', 'transunion').canonicalStatus).toBe('query');
    expect(mapCraPaymentCode('G', 'transunion').canonicalStatus).toBe('gone_away');
  });

  it('returns "unknown" with warning for unrecognised codes', () => {
    const result = mapCraPaymentCode('X', 'transunion');
    expect(result.canonicalStatus).toBe('unknown');
    expect(result.warning).toBeDefined();
    expect(result.warning!.message).toContain('X');
    expect(result.warning!.message).toContain('transunion');
  });

  it('returns "unknown" with warning for unknown CRA', () => {
    const result = mapCraPaymentCode('0', 'unknownCRA');
    expect(result.canonicalStatus).toBe('unknown');
    expect(result.warning).toBeDefined();
  });
});
