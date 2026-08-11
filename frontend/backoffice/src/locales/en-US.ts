import type { Messages } from './index';

/**
 * English (US). Typed as `Messages`, which is derived from the Portuguese catalogue — so a key
 * added there and forgotten here fails to compile, rather than reaching a customer as a
 * Portuguese sentence in an English screen.
 */
const enUS: Messages = {
  'nav.dashboard': 'Dashboard',
  'nav.schools': 'Schools',
  'nav.users': 'Users',
  'nav.backoffice': 'Backoffice',
  'nav.language': 'Language',

  'shell.notificationsComingSoon': 'Coming soon',
} as const;

export default enUS;
