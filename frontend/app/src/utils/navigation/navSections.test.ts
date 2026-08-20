import { describe, expect, it } from 'vitest';
import paths from 'routes/paths';
import {
  groupMenuItemsBySection,
  isNavRouteActive,
  NAV_SECTION_ORDER,
} from './navSections';
import type { MenuItem } from 'routes/sitemap';

const item = (id: string, section: MenuItem['section'] = 'primary'): MenuItem => ({
  id,
  subheader: `nav.${id}`,
  path: `/${id}`,
  section,
});

describe('isNavRouteActive', () => {
  it('matches the dashboard root exactly', () => {
    expect(isNavRouteActive('/', paths.dashboard, 'dashboard')).toBe(true);
    expect(isNavRouteActive('/boletos', paths.dashboard, 'dashboard')).toBe(false);
  });

  it('matches nested staff routes under the nav path', () => {
    expect(isNavRouteActive('/pessoas/estudantes', paths.students, 'students')).toBe(true);
    expect(isNavRouteActive('/pessoas/estudantes/42', paths.students, 'students')).toBe(true);
    expect(isNavRouteActive('/pessoas/responsaveis', paths.students, 'students')).toBe(false);
  });
});

describe('groupMenuItemsBySection', () => {
  it('groups items in sidebar section order', () => {
    const grouped = groupMenuItemsBySection([
      item('users', 'accounts'),
      item('dashboard', 'primary'),
      item('charges', 'billing'),
      item('platform-subscription', 'settings'),
      item('my-charges', 'family'),
    ]);

    expect(grouped.primary.map((row) => row.id)).toEqual(['dashboard']);
    expect(grouped.family.map((row) => row.id)).toEqual(['my-charges']);
    expect(grouped.billing.map((row) => row.id)).toEqual(['charges']);
    expect(grouped.settings.map((row) => row.id)).toEqual(['platform-subscription']);
    expect(grouped.accounts.map((row) => row.id)).toEqual(['users']);
    expect(NAV_SECTION_ORDER).toEqual(['primary', 'family', 'billing', 'settings', 'accounts']);
  });

  it('defaults missing section to primary', () => {
    const grouped = groupMenuItemsBySection([item('dashboard')]);
    expect(grouped.primary.map((row) => row.id)).toEqual(['dashboard']);
  });
});
