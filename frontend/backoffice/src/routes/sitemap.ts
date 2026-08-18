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
];

export default sitemap;
