import paths from './paths';

export interface SubMenuItem {
  name: string;
  pathName: string;
  path: string;
  active?: boolean;
  items?: SubMenuItem[];
  requiredPermission?: string;
}

export interface MenuItem {
  id: string;
  subheader: string;
  path?: string;
  icon?: string;
  avatar?: string;
  active?: boolean;
  items?: SubMenuItem[];
  /** When set, the item is hidden unless the current membership includes this permission key. */
  requiredPermission?: string;
  /**
   * When set, the item is shown only to a membership in this role. Permissions cannot express
   * this: a guardian holds none, so a guardian-only entry gated by a permission key would be
   * hidden from the only people it is for.
   */
  requiredRole?: string;
}

const sitemap: MenuItem[] = [
  {
    id: 'dashboard',
    subheader: 'nav.dashboard',
    path: paths.dashboard,
    icon: 'mingcute:home-1-fill',
    active: true,
  },
  {
    id: 'students',
    subheader: 'nav.students',
    path: paths.students,
    icon: 'mingcute:school-line',
    active: true,
    requiredPermission: 'manage_people',
  },
  {
    id: 'guardians',
    subheader: 'nav.guardians',
    path: paths.guardians,
    icon: 'mingcute:user-2-fill',
    active: true,
    requiredPermission: 'manage_people',
  },
  {
    // A teacher's account, in prose, of how a student is getting on. Gated on `teach` because
    // that is who writes one — the office files the school's papers, it does not write these.
    id: 'preceptorship',
    subheader: 'nav.preceptorship',
    path: paths.preceptorship,
    icon: 'mingcute:quill-pen-line',
    active: true,
    requiredPermission: 'teach',
  },
  {
    // The family's side of the same thing.
    id: 'my-preceptorship',
    subheader: 'nav.myPreceptorship',
    path: paths.myPreceptorship,
    icon: 'mingcute:quill-pen-line',
    active: true,
    requiredRole: 'guardian',
  },
  {
    // What guardians have asked the school for. The archive desk answers these, which is the
    // desk `manage_documents` describes — a declaration is a document the school issues.
    id: 'requests',
    subheader: 'nav.requests',
    path: paths.requests,
    icon: 'mingcute:inbox-line',
    active: true,
    requiredPermission: 'manage_documents',
  },
  {
    // The guardian's own side of the same queue.
    id: 'my-requests',
    subheader: 'nav.myRequests',
    path: paths.myRequests,
    icon: 'mingcute:inbox-line',
    active: true,
    requiredRole: 'guardian',
  },
  // "Equipe" is off the menu: the register of who works at the school is Colaboradores, and the
  // two read as the same thing to anyone scanning the sidebar. The page itself is kept — it is
  // the only place a membership's permissions can be edited — and stays reachable at its path.
  {
    id: 'collaborators',
    subheader: 'nav.collaborators',
    path: paths.collaborators,
    icon: 'mingcute:presentation-2-line',
    active: true,
  },
  {
    id: 'grades',
    subheader: 'nav.grades',
    path: paths.grades,
    icon: 'mingcute:edit-4-line',
    active: true,
  },
  {
    // Turmas and Matérias are tabs inside this page: they are what a lesson is made of, and three
    // separate menu entries made an obvious sequence read as three unrelated screens.
    id: 'lessons',
    subheader: 'nav.lessons',
    path: paths.lessons,
    icon: 'mingcute:book-5-line',
    active: true,
  },
  {
    id: 'job-positions',
    subheader: 'nav.jobPositions',
    path: paths.jobPositions,
    icon: 'mingcute:idcard-line',
    active: true,
  },
  {
    id: 'charges',
    subheader: 'nav.charges',
    path: paths.charges,
    icon: 'mingcute:bill-line',
    active: true,
    requiredPermission: 'manage_billing',
  },
  {
    id: 'plans',
    subheader: 'nav.plans',
    path: paths.plans,
    icon: 'mingcute:currency-dollar-line',
    active: true,
    requiredPermission: 'manage_billing',
  },
  {
    id: 'billing-settings',
    subheader: 'nav.billingSettings',
    path: paths.billingSettings,
    icon: 'mingcute:settings-3-line',
    active: true,
    requiredPermission: 'manage_billing',
  },
  {
    id: 'contract-template',
    subheader: 'nav.contract',
    path: paths.contractTemplate,
    icon: 'mingcute:document-2-line',
    active: true,
    requiredPermission: 'manage_billing',
  },
];

/**
 * Reachable places that are not menu entries.
 *
 * Turmas and Matérias moved inside Aulas as tabs, which took them out of the nav — but someone
 * typing "Turmas" into the search still means to go there, and a search that stopped finding them
 * would read as the pages having been removed.
 */
export const searchableSubPages: MenuItem[] = [
  {
    id: 'school-classes',
    subheader: 'nav.classes',
    path: `${paths.lessons}?tab=classes`,
  },
  {
    id: 'subjects',
    subheader: 'nav.subjects',
    path: `${paths.lessons}?tab=subjects`,
  },
];

export default sitemap;
