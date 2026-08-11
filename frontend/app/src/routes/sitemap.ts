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
    id: 'team',
    subheader: 'nav.team',
    path: paths.team,
    icon: 'mingcute:group-line',
    active: true,
    requiredPermission: 'manage_people',
  },
  {
    id: 'collaborators',
    subheader: 'nav.collaborators',
    path: paths.collaborators,
    icon: 'mingcute:presentation-2-line',
    active: true,
  },
  {
    id: 'school-classes',
    subheader: 'nav.classes',
    path: paths.schoolClasses,
    icon: 'mingcute:group-2-line',
    active: true,
  },
  {
    id: 'subjects',
    subheader: 'nav.subjects',
    path: paths.subjects,
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

export default sitemap;
