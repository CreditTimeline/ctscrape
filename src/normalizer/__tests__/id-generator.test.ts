import { describe, it, expect } from 'vitest';
import { deterministicHash, generateId, generateSequentialId } from '../id-generator';

describe('deterministicHash', () => {
  it('produces an 8-character hex string', () => {
    const result = deterministicHash('test input');
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it('returns the same hash for the same input', () => {
    const a = deterministicHash('hello world');
    const b = deterministicHash('hello world');
    expect(a).toBe(b);
  });

  it('returns different hashes for different inputs', () => {
    const a = deterministicHash('input-a');
    const b = deterministicHash('input-b');
    expect(a).not.toBe(b);
  });

  it('handles empty string', () => {
    const result = deterministicHash('');
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it('handles unicode characters', () => {
    const result = deterministicHash('£1,234.56');
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('generateId', () => {
  it('creates prefix:hash format', () => {
    const id = generateId('file', '2024-01-01', 'https://example.com');
    expect(id).toMatch(/^file:[0-9a-f]{8}$/);
  });

  it('is deterministic for the same parts', () => {
    const a = generateId('canon', 'Barclays', 'credit_card', '1234', '2020-01');
    const b = generateId('canon', 'Barclays', 'credit_card', '1234', '2020-01');
    expect(a).toBe(b);
  });

  it('produces different IDs for different parts', () => {
    const a = generateId('tl', 'equifax', 'account-1');
    const b = generateId('tl', 'equifax', 'account-2');
    expect(a).not.toBe(b);
  });

  it('matches the allowed ID pattern', () => {
    const id = generateId('file', 'some-data');
    expect(id).toMatch(/^[A-Za-z0-9._:-]+$/);
  });
});

describe('generateSequentialId', () => {
  it('creates prefix:counter format', () => {
    const id = generateSequentialId('tl', 1);
    expect(id).toBe('tl:1');
  });

  it('increments correctly', () => {
    const ids = [0, 1, 2].map((i) => generateSequentialId('addr', i));
    expect(ids).toEqual(['addr:0', 'addr:1', 'addr:2']);
  });

  it('matches the allowed ID pattern', () => {
    const id = generateSequentialId('org', 42);
    expect(id).toMatch(/^[A-Za-z0-9._:-]+$/);
  });
});
