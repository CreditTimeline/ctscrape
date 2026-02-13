import { describe, it, expect } from 'vitest';
import { getErrorInfo } from '../../../lib/logger/error-catalog';

describe('getErrorInfo', () => {
  const knownCodes = [
    'NETWORK_ERROR',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'VALIDATION_FAILED',
    'DUPLICATE_IMPORT',
    'RATE_LIMITED',
    'NOT_READY',
    'EXTRACTION_FAILED',
    'NORMALISATION_FAILED',
    'NO_TAB',
    'NO_DATA',
    'NOT_CONFIGURED',
    'UNKNOWN',
  ];

  it.each(knownCodes)('returns info for known code: %s', (code) => {
    const info = getErrorInfo(code);
    expect(info).not.toBeNull();
    expect(info!.title).toBeTruthy();
    expect(info!.description).toBeTruthy();
    expect(info!.troubleshooting.length).toBeGreaterThan(0);
    expect(['low', 'medium', 'high', 'critical']).toContain(info!.severity);
    expect(typeof info!.retryable).toBe('boolean');
  });

  it('returns null for unknown error code', () => {
    expect(getErrorInfo('DOES_NOT_EXIST')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getErrorInfo('')).toBeNull();
  });

  it('NETWORK_ERROR is retryable', () => {
    expect(getErrorInfo('NETWORK_ERROR')!.retryable).toBe(true);
  });

  it('UNAUTHORIZED is not retryable', () => {
    expect(getErrorInfo('UNAUTHORIZED')!.retryable).toBe(false);
  });

  it('RATE_LIMITED is retryable', () => {
    expect(getErrorInfo('RATE_LIMITED')!.retryable).toBe(true);
  });

  it('VALIDATION_FAILED is not retryable', () => {
    expect(getErrorInfo('VALIDATION_FAILED')!.retryable).toBe(false);
  });
});
