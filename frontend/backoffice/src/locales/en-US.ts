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

  'backoffice.dashboard.title': 'Dashboard',
  'backoffice.dashboard.subtitle': 'Platform-wide onboarding overview.',
  'backoffice.dashboard.onboarding.title': 'Schools by onboarding status',
  'backoffice.dashboard.loading': 'Loading metrics',
  'backoffice.dashboard.loadError': 'Could not load dashboard metrics.',
  'backoffice.dashboard.noAccess.title': 'No access to this area',
  'backoffice.dashboard.noAccess.description':
    'The platform dashboard is available only to backoffice operators.',
  'backoffice.dashboard.status.provisioning': 'Provisioning',
  'backoffice.dashboard.status.pendingHandoff': 'Pending handoff',
  'backoffice.dashboard.status.active': 'Active',
  'backoffice.dashboard.link.provisioning': 'View provisioning',
  'backoffice.dashboard.link.pendingHandoff': 'View pending handoff',
  'backoffice.dashboard.viewSchools': 'View all schools',

  'backoffice.schools.title': 'Schools',
  'backoffice.users.title': 'Users',
  'backoffice.schoolActivation.title': 'School activation',
  'backoffice.provisioning.title': 'School provisioning',
  'backoffice.provisioning.completeTitle': 'Provisioning complete',
  'backoffice.provisioning.closedTitle': 'Provisioning closed',

  'error404.title': 'Page not found',
  'error404.description': 'The page you are looking for does not exist or has been moved.',
  'error404.home': 'Go back home',
} as const;

export default enUS;
