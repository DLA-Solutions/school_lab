/**
 * The product's default catalogue, and the source of truth for what keys exist — `MessageKey` is
 * derived from it, so English is checked against this file at compile time.
 *
 * Keys read `area.thing`: the screen first, then what the string is for. A message used on more
 * than one screen goes under `common`.
 */
const ptBR = {
  'nav.dashboard': 'Dashboard',
  'nav.schools': 'Escolas',
  'nav.backoffice': 'Backoffice',
  'nav.language': 'Idioma',

  'shell.notificationsComingSoon': 'Em breve',
} as const;

export default ptBR;
