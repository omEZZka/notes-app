import { describe, it, expect } from 'vitest';
import { countChars, countWords, formatCount } from './text';

describe('countWords', () => {
  it('считает слова', () => {
    expect(countWords('раз два три')).toBe(3);
  });

  it('схлопывает лишние пробелы и переносы', () => {
    expect(countWords('  раз   два \n\n три  ')).toBe(3);
  });

  it('пустая строка — 0', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n ')).toBe(0);
  });

  it('одно слово — 1', () => {
    expect(countWords('слово')).toBe(1);
  });
});

describe('countChars', () => {
  it('считает символы', () => {
    expect(countChars('абв')).toBe(3);
  });

  it('пустая строка — 0', () => {
    expect(countChars('')).toBe(0);
  });
});

describe('formatCount', () => {
  it('разделяет разряды неразрывным пробелом', () => {
    expect(formatCount(12345)).toContain('12');
    expect(formatCount(0)).toBe('0');
  });
});
