import paths from 'routes/paths';
import type { MenuItem, NavSection } from 'routes/sitemap';
import type { MessageKey } from 'locales';

/** Sidebar section order — primary has no visible label. */
export const NAV_SECTION_ORDER: NavSection[] = [
  'primary',
  'family',
  'billing',
  'settings',
  'accounts',
];

export const NAV_SECTION_LABEL_KEYS: Partial<Record<NavSection, MessageKey>> = {
  family: 'nav.section.family',
  billing: 'nav.section.billing',
  settings: 'nav.section.settings',
  accounts: 'nav.section.accounts',
};

export const isNavRouteActive = (pathname: string, path?: string, id?: string): boolean => {
  if (!path) {
    return false;
  }

  if (id === 'dashboard') {
    return pathname === paths.dashboard || pathname === '/';
  }

  return pathname === path || pathname.startsWith(`${path}/`);
};

export const groupMenuItemsBySection = (items: MenuItem[]): Record<NavSection, MenuItem[]> => {
  const grouped = Object.fromEntries(
    NAV_SECTION_ORDER.map((section) => [section, [] as MenuItem[]]),
  ) as Record<NavSection, MenuItem[]>;

  for (const item of items) {
    const section = item.section ?? 'primary';
    grouped[section].push(item);
  }

  return grouped;
};
