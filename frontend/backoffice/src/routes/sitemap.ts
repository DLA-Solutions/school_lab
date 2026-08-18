import paths from './paths';

export interface SubMenuItem {
  name: string;
  pathName: string;
  path: string;
  active?: boolean;
  items?: SubMenuItem[];
}

export interface MenuItem {
  id: string;
  subheader: string;
  path?: string;
  icon?: string;
  avatar?: string;
  active?: boolean;
  items?: SubMenuItem[];
}

const sitemap: MenuItem[] = [
  {
    id: 'dashboard',
    subheader: 'nav.dashboard',
    path: paths.dashboard,
    icon: 'mingcute:home-3-line',
  },
  {
    id: 'schools',
    subheader: 'nav.schools',
    path: paths.schools,
    icon: 'mingcute:school-line',
  },
  {
    id: 'users',
    subheader: 'nav.users',
    path: paths.users,
    icon: 'mingcute:user-3-line',
  },
  {
    id: 'audits',
    subheader: 'nav.audits',
    path: paths.audits,
    icon: 'mingcute:history-line',
  },
  {
    id: 'schoolGroups',
    subheader: 'nav.schoolGroups',
    path: paths.schoolGroups,
    icon: 'mingcute:group-3-line',
  },
  {
    id: 'subscriptions',
    subheader: 'nav.subscriptions',
    path: paths.subscriptions,
    icon: 'mingcute:wallet-4-line',
  },
  {
    id: 'analytics',
    subheader: 'nav.analytics',
    path: paths.analytics,
    icon: 'mingcute:chart-bar-line',
  },
  {
    id: 'helpTaxonomy',
    subheader: 'nav.helpTaxonomy',
    path: paths.helpTaxonomy,
    icon: 'mingcute:book-6-line',
  },
];

export default sitemap;
