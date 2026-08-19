import { describe, expect, it } from 'vitest';
import { staffMembership, guardianMembership } from 'test/msw/handlers';
import sitemap, { searchableSubPages } from 'routes/sitemap';
import {
  isModuleEnabledForMembership,
  menuItemModuleKey,
  routeAudienceForPath,
  routeModuleKeyForPath,
  visibleMenuItems,
  visibleSitemap,
} from 'utils/navigation/visibleSitemap';
import paths from 'routes/paths';
import { SchoolModuleKey } from 'types/auth';

describe('visibleSitemap module filtering', () => {
  const billingStaff = {
    ...staffMembership,
    permissions: ['manage_billing', 'manage_people'],
  };

  it('maps billing sitemap ids to the billing module', () => {
    expect(menuItemModuleKey(sitemap.find((item) => item.id === 'charges')!)).toBe('billing');
    expect(menuItemModuleKey(sitemap.find((item) => item.id === 'dashboard')!)).toBeNull();
  });

  it('maps billing and academic SPA paths for route guards', () => {
    expect(routeModuleKeyForPath(paths.charges)).toBe('billing');
    expect(routeModuleKeyForPath(paths.students)).toBe('academic');
    expect(routeModuleKeyForPath(paths.collaborators)).toBe('academic');
    expect(routeModuleKeyForPath(paths.dashboard)).toBeNull();
  });

  it('maps route audiences for deep-link guards', () => {
    expect(routeAudienceForPath(paths.dashboard)).toBe('shared');
    expect(routeAudienceForPath(paths.myPreceptorship)).toBe('guardian');
    expect(routeAudienceForPath(paths.myReportCards)).toBe('guardian');
    expect(routeAudienceForPath(paths.myTaxDeclarations)).toBe('guardian');
    expect(routeAudienceForPath(paths.myCharges)).toBe('guardian');
    expect(routeAudienceForPath(paths.reportCards)).toBe('staff');
  });

  it('hides billing menu items when billing module is disabled', () => {
    const membership = {
      ...billingStaff,
      enabled_modules: ['communication', 'academic', 'documents'] as SchoolModuleKey[],
    };

    const ids = visibleSitemap(membership).map((item) => item.id);

    expect(ids).not.toContain('charges');
    expect(ids).not.toContain('plans');
    expect(ids).not.toContain('billing-settings');
    expect(ids).not.toContain('contract-template');
    expect(ids).toContain('students');
    expect(ids).toContain('lessons');
  });

  it('hides academic menu items when academic module is disabled', () => {
    const membership = {
      ...billingStaff,
      enabled_modules: ['communication', 'billing', 'documents'] as SchoolModuleKey[],
    };

    const ids = visibleSitemap(membership).map((item) => item.id);

    expect(ids).not.toContain('students');
    expect(ids).not.toContain('guardians');
    expect(ids).not.toContain('lessons');
    expect(ids).toContain('charges');
  });

  it('filters searchable sub-pages by module', () => {
    const membership = {
      ...billingStaff,
      enabled_modules: ['communication', 'billing', 'documents'] as SchoolModuleKey[],
    };

    const ids = visibleMenuItems(membership, searchableSubPages).map((item) => item.id);

    expect(ids).not.toContain('school-classes');
    expect(ids).not.toContain('subjects');
  });

  it('keeps module-gated items visible when enabled_modules is absent', () => {
    const membership = { ...billingStaff };
    delete membership.enabled_modules;

    expect(isModuleEnabledForMembership(membership, 'billing')).toBe(true);
    expect(visibleSitemap(membership).map((item) => item.id)).toContain('charges');
  });

  it('still applies permission checks after module filtering', () => {
    const membership = {
      ...staffMembership,
      permissions: ['manage_people'],
      enabled_modules: ['communication', 'academic', 'billing', 'documents'] as SchoolModuleKey[],
    };

    const ids = visibleSitemap(membership).map((item) => item.id);

    expect(ids).not.toContain('charges');
    expect(ids).toContain('students');
  });
});

describe('visibleSitemap audience filtering', () => {
  it('shows only guardian destinations for a guardian membership', () => {
    const ids = visibleSitemap(guardianMembership).map((item) => item.id);

    expect(ids).toEqual([
      'dashboard',
      'my-charges',
      'my-health-records',
      'my-pickups',
      'my-preceptorship',
      'my-report-cards',
      'my-tax-declarations',
      'my-requests',
    ]);
  });

  it('hides guardian-only items from staff memberships', () => {
    const ids = visibleSitemap(staffMembership).map((item) => item.id);

    expect(ids).not.toContain('my-preceptorship');
    expect(ids).not.toContain('my-report-cards');
    expect(ids).not.toContain('my-tax-declarations');
    expect(ids).not.toContain('my-requests');
    expect(ids).not.toContain('my-charges');
  });

  it('hides staff searchable sub-pages from guardians', () => {
    const ids = visibleMenuItems(guardianMembership, searchableSubPages).map((item) => item.id);

    expect(ids).toEqual([]);
  });
});
