import { describe, it, expect } from 'vitest';
import {
  parseLongDate,
  parseSlashDate,
  parseAmount,
  normalizeWhitespace,
  extractCellText,
} from '../parsers';
import { NO_DATA_SENTINEL } from '../constants';

describe('parseLongDate', () => {
  it('parses a standard date', () => {
    expect(parseLongDate('20 August 2024')).toBe('2024-08-20');
  });

  it('parses a date with single-digit day', () => {
    expect(parseLongDate('9 July 1986')).toBe('1986-07-09');
  });

  it('parses a date with leading zero on day', () => {
    expect(parseLongDate('01 January 2000')).toBe('2000-01-01');
  });

  it('handles all months', () => {
    expect(parseLongDate('15 February 2020')).toBe('2020-02-15');
    expect(parseLongDate('1 March 2021')).toBe('2021-03-01');
    expect(parseLongDate('30 April 2019')).toBe('2019-04-30');
    expect(parseLongDate('5 May 2018')).toBe('2018-05-05');
    expect(parseLongDate('10 June 2017')).toBe('2017-06-10');
    expect(parseLongDate('31 October 2023')).toBe('2023-10-31');
    expect(parseLongDate('25 November 2022')).toBe('2022-11-25');
    expect(parseLongDate('31 December 2024')).toBe('2024-12-31');
    expect(parseLongDate('14 September 2021')).toBe('2021-09-14');
  });

  it('is case-insensitive for month name', () => {
    expect(parseLongDate('20 august 2024')).toBe('2024-08-20');
    expect(parseLongDate('20 AUGUST 2024')).toBe('2024-08-20');
  });

  it('trims whitespace', () => {
    expect(parseLongDate('  20 August 2024  ')).toBe('2024-08-20');
  });

  it('returns null for empty string', () => {
    expect(parseLongDate('')).toBeNull();
  });

  it('returns null for invalid month name', () => {
    expect(parseLongDate('20 Foobar 2024')).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(parseLongDate('not a date')).toBeNull();
  });

  it('returns null for slash date format', () => {
    expect(parseLongDate('09/09/2025')).toBeNull();
  });

  it('returns null for ISO format', () => {
    expect(parseLongDate('2024-08-20')).toBeNull();
  });
});

describe('parseSlashDate', () => {
  it('parses DD/MM/YYYY', () => {
    expect(parseSlashDate('09/09/2025')).toBe('2025-09-09');
  });

  it('parses first day of year', () => {
    expect(parseSlashDate('01/01/2020')).toBe('2020-01-01');
  });

  it('parses last day of year', () => {
    expect(parseSlashDate('31/12/2024')).toBe('2024-12-31');
  });

  it('trims whitespace', () => {
    expect(parseSlashDate('  09/09/2025  ')).toBe('2025-09-09');
  });

  it('returns null for single-digit day/month (no leading zero)', () => {
    expect(parseSlashDate('9/9/2025')).toBeNull();
  });

  it('returns null for invalid month > 12', () => {
    expect(parseSlashDate('01/13/2025')).toBeNull();
  });

  it('returns null for invalid month = 0', () => {
    expect(parseSlashDate('01/00/2025')).toBeNull();
  });

  it('returns null for invalid day = 0', () => {
    expect(parseSlashDate('00/01/2025')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseSlashDate('')).toBeNull();
  });

  it('returns null for long-form date', () => {
    expect(parseSlashDate('20 August 2024')).toBeNull();
  });

  it('returns null for MM/DD/YYYY-like garbage', () => {
    expect(parseSlashDate('abc/de/fghi')).toBeNull();
  });
});

describe('parseAmount', () => {
  it('parses £1,234 to 123400', () => {
    expect(parseAmount('£1,234')).toBe(123400);
  });

  it('parses £1,234.56 to 123456', () => {
    expect(parseAmount('£1,234.56')).toBe(123456);
  });

  it('parses £0 to 0', () => {
    expect(parseAmount('£0')).toBe(0);
  });

  it('parses £0.00 to 0', () => {
    expect(parseAmount('£0.00')).toBe(0);
  });

  it('parses amount without £ symbol', () => {
    expect(parseAmount('1,234.56')).toBe(123456);
  });

  it('parses simple integer', () => {
    expect(parseAmount('500')).toBe(50000);
  });

  it('parses amount with single decimal digit (£1.5 -> 150)', () => {
    expect(parseAmount('£1.5')).toBe(150);
  });

  it('parses negative amount', () => {
    expect(parseAmount('-£1,234.56')).toBe(-123456);
  });

  it('parses negative amount without symbol', () => {
    expect(parseAmount('-500')).toBe(-50000);
  });

  it('trims whitespace', () => {
    expect(parseAmount('  £1,234  ')).toBe(123400);
  });

  it('parses large amounts', () => {
    expect(parseAmount('£100,000.00')).toBe(10000000);
  });

  it('returns null for empty string', () => {
    expect(parseAmount('')).toBeNull();
  });

  it('returns null for non-numeric', () => {
    expect(parseAmount('abc')).toBeNull();
  });

  it('returns null for just £', () => {
    expect(parseAmount('£')).toBeNull();
  });
});

describe('normalizeWhitespace', () => {
  it('collapses multiple spaces', () => {
    expect(normalizeWhitespace('hello   world')).toBe('hello world');
  });

  it('collapses tabs', () => {
    expect(normalizeWhitespace('hello\tworld')).toBe('hello world');
  });

  it('collapses newlines', () => {
    expect(normalizeWhitespace('hello\n\nworld')).toBe('hello world');
  });

  it('collapses mixed whitespace', () => {
    expect(normalizeWhitespace('  hello \t\n  world  ')).toBe('hello world');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeWhitespace('  hello  ')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(normalizeWhitespace('')).toBe('');
  });

  it('handles string with only whitespace', () => {
    expect(normalizeWhitespace('   \t\n  ')).toBe('');
  });

  it('preserves single spaces', () => {
    expect(normalizeWhitespace('hello world')).toBe('hello world');
  });
});

describe('extractCellText', () => {
  function makeElement(text: string): Element {
    // Minimal Element-like object for testing
    return { textContent: text } as unknown as Element;
  }

  it('extracts and trims text', () => {
    expect(extractCellText(makeElement('  Hello World  '))).toBe('Hello World');
  });

  it('collapses whitespace in element text', () => {
    expect(extractCellText(makeElement('Hello\n  World'))).toBe('Hello World');
  });

  it('returns null for null element', () => {
    expect(extractCellText(null)).toBeNull();
  });

  it('returns null for empty text', () => {
    expect(extractCellText(makeElement(''))).toBeNull();
  });

  it('returns null for whitespace-only text', () => {
    expect(extractCellText(makeElement('   \n\t  '))).toBeNull();
  });

  it('returns null when text matches default sentinel', () => {
    expect(extractCellText(makeElement(NO_DATA_SENTINEL))).toBeNull();
  });

  it('returns null when text matches custom sentinel', () => {
    expect(extractCellText(makeElement('N/A'), 'N/A')).toBeNull();
  });

  it('returns text when it does not match sentinel', () => {
    expect(extractCellText(makeElement('Some data'), 'N/A')).toBe('Some data');
  });

  it('handles element with null textContent', () => {
    const el = { textContent: null } as unknown as Element;
    expect(extractCellText(el)).toBeNull();
  });
});
