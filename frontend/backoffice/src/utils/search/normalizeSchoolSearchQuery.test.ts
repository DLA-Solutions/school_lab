import { describe, expect, it } from 'vitest';
import { normalizeSchoolSearchQuery } from './normalizeSchoolSearchQuery';

describe('normalizeSchoolSearchQuery', () => {
  it('strips CNPJ punctuation for digit-heavy queries', () => {
    expect(normalizeSchoolSearchQuery('12.345.678/0001-90')).toBe('12345678000190');
  });

  it('preserves name searches', () => {
    expect(normalizeSchoolSearchQuery('Escola Alpha')).toBe('Escola Alpha');
  });

  it('returns empty string for blank input', () => {
    expect(normalizeSchoolSearchQuery('   ')).toBe('');
  });
});
