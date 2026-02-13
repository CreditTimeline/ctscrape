import { describe, it, expect } from 'vitest';
import { parseUkAddress } from '../../mappers/address-parser';

describe('parseUkAddress', () => {
  it('parses a full UK address with postcode', () => {
    const result = parseUkAddress('10 Downing Street, Westminster, London, SW1A 2AA');
    expect(result.line_1).toBe('10 Downing Street');
    expect(result.line_2).toBe('Westminster');
    expect(result.town_city).toBe('London');
    expect(result.postcode).toBe('SW1A 2AA');
    expect(result.country_code).toBe('GB');
  });

  it('parses address without postcode', () => {
    const result = parseUkAddress('42 High Street, Manchester');
    expect(result.line_1).toBe('42 High Street');
    expect(result.town_city).toBe('Manchester');
    expect(result.postcode).toBeUndefined();
    expect(result.country_code).toBe('GB');
  });

  it('parses address with multiple lines before town and postcode', () => {
    const result = parseUkAddress('Flat 3, 15 Oak Avenue, Suburbia, Leeds, LS1 4BT');
    expect(result.line_1).toBe('Flat 3');
    expect(result.line_2).toBe('15 Oak Avenue, Suburbia');
    expect(result.town_city).toBe('Leeds');
    expect(result.postcode).toBe('LS1 4BT');
  });

  it('produces uppercase normalized single line', () => {
    const result = parseUkAddress('10 Downing Street, London, SW1A 2AA');
    expect(result.normalized_single_line).toBe(result.normalized_single_line.toUpperCase());
    expect(result.normalized_single_line).toContain('DOWNING STREET');
  });

  it('always sets country_code to GB', () => {
    const result = parseUkAddress('Some Address');
    expect(result.country_code).toBe('GB');
  });

  it('handles a single-part address', () => {
    const result = parseUkAddress('Unknown Location');
    expect(result.line_1).toBe('Unknown Location');
    expect(result.country_code).toBe('GB');
  });

  it('handles postcode without spaces', () => {
    const result = parseUkAddress('1 Test Road, Bristol, BS11AA');
    expect(result.postcode).toBe('BS1 1AA');
    expect(result.town_city).toBe('Bristol');
  });
});
