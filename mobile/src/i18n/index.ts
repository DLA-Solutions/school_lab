import { ptBR, type MessageKey } from './pt-BR';

export type { MessageKey };

export function t(key: MessageKey): string {
  return ptBR[key];
}
