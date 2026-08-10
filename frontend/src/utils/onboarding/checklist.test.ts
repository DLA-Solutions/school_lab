import { describe, expect, it } from 'vitest';
import { handoffChecklistLabel, parseHandoffChecklist } from 'utils/onboarding/checklist';

describe('onboarding checklist helpers', () => {
  it('maps known checklist keys to pt-BR labels', () => {
    expect(handoffChecklistLabel('billing')).toBe('Cobrança configurada ou adiada');
    expect(handoffChecklistLabel('owner_active')).toBe('Proprietário com acesso ativo');
  });

  it('parses checklist array from API error details', () => {
    expect(parseHandoffChecklist({ checklist: ['billing', 'owner_active'] })).toEqual([
      'billing',
      'owner_active',
    ]);
  });

  it('returns empty array when checklist is missing', () => {
    expect(parseHandoffChecklist({})).toEqual([]);
    expect(parseHandoffChecklist({ checklist: 'billing' })).toEqual([]);
  });
});
