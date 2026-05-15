import { describe, it, expect } from 'vitest';
import { generateTempPassword } from '../lib/passwordGen';

describe('generateTempPassword', () => {
  it('matches Adj-Noun-3digit pattern', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generateTempPassword();
      expect(pw).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+-\d{3}$/);
    }
  });

  it('is not constant across calls', () => {
    const set = new Set<string>();
    for (let i = 0; i < 50; i++) set.add(generateTempPassword());
    expect(set.size).toBeGreaterThan(1);
  });
});
