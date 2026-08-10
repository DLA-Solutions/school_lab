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
    subheader: 'Dashboard',
    path: paths.dashboard,
    icon: 'mingcute:home-1-fill',
    active: true,
  },
  {
    id: 'students',
    subheader: 'Students',
    path: paths.students,
    icon: 'mingcute:school-line',
    active: true,
  },
  {
    id: 'guardians',
    subheader: 'Guardians',
    path: paths.guardians,
    icon: 'mingcute:user-2-fill',
    active: true,
  },
  {
    id: 'collaborators',
    subheader: 'Collaborators',
    path: paths.collaborators,
    icon: 'mingcute:presentation-2-line',
    active: true,
  },
  {
    id: 'school-classes',
    subheader: 'Classes',
    path: paths.schoolClasses,
    icon: 'mingcute:group-2-line',
    active: true,
  },
  {
    id: 'subjects',
    subheader: 'Subjects',
    path: paths.subjects,
    icon: 'mingcute:book-5-line',
    active: true,
  },
  {
    id: 'job-positions',
    subheader: 'Positions',
    path: paths.jobPositions,
    icon: 'mingcute:idcard-line',
    active: true,
  },
  {
    id: 'charges',
    subheader: 'Boletos',
    path: paths.charges,
    icon: 'mingcute:bill-line',
    active: true,
  },
  {
    id: 'plans',
    subheader: 'Plans',
    path: paths.plans,
    icon: 'mingcute:currency-dollar-line',
    active: true,
  },
  {
    id: 'contract-template',
    subheader: 'Contract',
    path: paths.contractTemplate,
    icon: 'mingcute:document-2-line',
    active: true,
  },
  {
    id: 'schools',
    subheader: 'Schools',
    path: paths.schools,
    icon: 'mingcute:building-2-line',
    active: true,
  },
];

export default sitemap;
