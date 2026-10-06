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
    expect(routeAudienceForPath(paths.communication)).toBe('guardian');
    expect(routeAudienceForPath(paths.staffCommunication)).toBe('staff');
    expect(routeModuleKeyForPath(paths.communication)).toBe('communication');
    expect(routeAudienceForPath(paths.reportCards)).toBe('staff');
    expect(routeAudienceForPath(paths.myHealthProfile)).toBe('staff');
  });

  // Stronger than a permission key: the Autentique token creates documents in the school's name,
  // so it stays with the owner however many permissions the rest of the staff hold.
  describe('owner-only entries', () => {
    const everyPermission = {
      ...staffMembership,
      permissions: [
        'manage_billing',
        'manage_people',
        'manage_school_settings',
        'manage_academics',
      ],
    };

    it('shows the signature entry to the school owner', () => {
      const ids = visibleSitemap({ ...everyPermission, is_owner: true }).map((item) => item.id);

      expect(ids).toContain('signature-credentials');
    });

    it('hides it from staff who are not the owner, whatever they may do', () => {
      const ids = visibleSitemap({ ...everyPermission, is_owner: false }).map((item) => item.id);

      expect(ids).not.toContain('signature-credentials');
    });

    // A legacy payload with no flag is not an owner; the route guard refuses either way.
    it('hides it when the payload does not say', () => {
      const ids = visibleSitemap({ ...everyPermission, is_owner: null }).map((item) => item.id);

      expect(ids).not.toContain('signature-credentials');
    });
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

  it('shows platform subscription nav for manage_school_settings even when billing is off', () => {
    const membership = {
      ...staffMembership,
      permissions: ['manage_school_settings'],
      enabled_modules: ['communication', 'academic', 'documents'] as SchoolModuleKey[],
    };

    const ids = visibleSitemap(membership).map((item) => item.id);

    expect(ids).toContain('platform-subscription');
    expect(ids).not.toContain('charges');
    expect(ids).not.toContain('plans');
    expect(routeModuleKeyForPath(paths.platformSubscription)).toBeNull();
    expect(routeAudienceForPath(paths.platformSubscription)).toBe('staff');
  });

  it('hides platform subscription nav from tuition-only billing staff', () => {
    const membership = {
      ...staffMembership,
      permissions: ['manage_billing'],
      enabled_modules: ['communication', 'academic', 'billing', 'documents'] as SchoolModuleKey[],
    };

    const ids = visibleSitemap(membership).map((item) => item.id);

    expect(ids).toContain('charges');
    expect(ids).toContain('plans');
    expect(ids).not.toContain('platform-subscription');
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
      'communication',
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

// BC6 — `includeRoles` is the inverse of `excludeRoles`: it narrows a `staff`-audience item
// down to one role specifically, rather than every role the audience bucket would otherwise
// admit (secretary, director, teacher all collapse into `staff`).
describe('visibleSitemap includeRoles filtering', () => {
  const teacherMembership = { ...staffMembership, role: 'teacher' };

  it('shows the collaborator health profile entry to a teacher', () => {
    const ids = visibleSitemap(teacherMembership).map((item) => item.id);

    expect(ids).toContain('my-health-profile');
  });

  it('hides the collaborator health profile entry from non-teacher staff', () => {
    const ids = visibleSitemap(staffMembership).map((item) => item.id);

    expect(ids).not.toContain('my-health-profile');
  });

  it('hides the collaborator health profile entry from a guardian', () => {
    const ids = visibleSitemap(guardianMembership).map((item) => item.id);

    expect(ids).not.toContain('my-health-profile');
  });

  it('hides an includeRoles entry when there is no active membership', () => {
    const ids = visibleMenuItems(null, [
      { id: 'teacher-only', subheader: 'nav.myHealthProfile', audience: 'staff' as const, includeRoles: ['teacher'] },
    ]).map((item) => item.id);

    expect(ids).toEqual([]);
  });
});

describe('visibleSitemap communication', () => {
  const withSystemKey = (systemKey: string) => ({
    ...staffMembership,
    role_template: staffMembership.role_template
      ? { ...staffMembership.role_template, system_key: systemKey }
      : null,
  });

  it('shows the family chat to a guardian and the school inbox to the offices that answer it', () => {
    expect(visibleSitemap(guardianMembership).map((item) => item.id)).toContain('communication');
    expect(visibleSitemap(guardianMembership).map((item) => item.id)).not.toContain(
      'staff-communication',
    );

    expect(visibleSitemap(staffMembership).map((item) => item.id)).toContain('staff-communication');
    expect(visibleSitemap({ ...staffMembership, role: 'teacher' }).map((item) => item.id)).toContain(
      'staff-communication',
    );
    expect(visibleSitemap(withSystemKey('coordination')).map((item) => item.id)).toContain(
      'staff-communication',
    );
    expect(visibleSitemap(withSystemKey('director')).map((item) => item.id)).toContain(
      'staff-communication',
    );
  });

  it('hides the school inbox from staff who are not teacher, secretary, coordination, or direction', () => {
    const ids = visibleSitemap(withSystemKey('receptionist')).map((item) => item.id);

    expect(ids).not.toContain('staff-communication');
    expect(ids).not.toContain('communication');
  });
});
