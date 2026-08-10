import { HandoffChecklistItem } from 'types/onboarding';

/** Maps API checklist keys to pt-BR labels for the handoff confirmation step. */
export const handoffChecklistLabel = (item: string): string => {
  const labels: Record<HandoffChecklistItem, string> = {
    billing: 'Cobrança configurada ou adiada',
    owner_active: 'Proprietário com acesso ativo',
    owner_invite: 'Convite do proprietário enviado',
    invalid_phase: 'Fase de onboarding inválida',
  };

  return labels[item as HandoffChecklistItem] ?? item;
};

export const parseHandoffChecklist = (details: Record<string, unknown>): string[] => {
  const checklist = details.checklist;

  if (!Array.isArray(checklist)) {
    return [];
  }

  return checklist.filter((item): item is string => typeof item === 'string');
};
