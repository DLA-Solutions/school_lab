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
    subheader: 'Estudantes',
    path: paths.students,
    icon: 'mingcute:school-line',
    active: true,
  },
  {
    id: 'guardians',
    subheader: 'Responsáveis',
    path: paths.guardians,
    icon: 'mingcute:user-2-fill',
    active: true,
  },
  {
    id: 'teachers',
    subheader: 'Professores',
    path: paths.teachers,
    icon: 'mingcute:presentation-2-line',
    active: true,
  },
  {
    id: 'school-classes',
    subheader: 'Turmas',
    path: paths.schoolClasses,
    icon: 'mingcute:group-2-line',
    active: true,
  },
  {
    id: 'subjects',
    subheader: 'Matérias',
    path: paths.subjects,
    icon: 'mingcute:book-5-line',
    active: true,
  },
  {
    id: 'schools',
    subheader: 'Escolas',
    path: paths.schools,
    icon: 'mingcute:building-2-line',
    active: true,
  },
];

export default sitemap;
