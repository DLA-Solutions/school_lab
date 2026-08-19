import { Membership, SchoolModuleKey } from 'types/auth';
import paths from 'routes/paths';
import sitemap, { MenuItem } from 'routes/sitemap';
import { membershipHasPermission } from 'utils/onboarding/access';
import {
  membershipAudience,
  membershipMatchesAudience,
  RouteAudience,
} from 'utils/membership/audience';

/** Maps sitemap item ids to the school module that gates visibility. */
const SITEMAP_MODULE_BY_ID: Partial<Record<string, SchoolModuleKey>> = {
  students: 'academic',
  guardians: 'academic',
  lessons: 'academic',
  'school-classes': 'academic',
  subjects: 'academic',
  charges: 'billing',
  plans: 'billing',
  'billing-settings': 'billing',
  'service-invoices': 'billing',
  'contract-template': 'billing',
  'my-charges': 'billing',
  'my-tax-declarations': 'billing',
  'report-cards': 'academic',
  'my-report-cards': 'academic',
};

/** Maps SPA paths to module keys for deep-link route guards (includes off-menu academic routes). */
const ROUTE_MODULE_BY_PATH: Partial<Record<string, SchoolModuleKey>> = {
  [paths.charges]: 'billing',
  [paths.plans]: 'billing',
  [paths.billingSettings]: 'billing',
  [paths.serviceInvoices]: 'billing',
  [paths.contractTemplate]: 'billing',
  [paths.students]: 'academic',
  [paths.guardians]: 'academic',
  [paths.lessons]: 'academic',
  [paths.schoolClasses]: 'academic',
  [paths.subjects]: 'academic',
  [paths.collaborators]: 'academic',
  [paths.jobPositions]: 'academic',
  [paths.grades]: 'academic',
  [paths.preceptorship]: 'academic',
  [paths.reportCards]: 'academic',
  [paths.requests]: 'documents',
  [paths.myPreceptorship]: 'academic',
  [paths.myReportCards]: 'academic',
  [paths.myTaxDeclarations]: 'billing',
  [paths.myCharges]: 'billing',
  [paths.myRequests]: 'documents',
};

/** Maps SPA paths to route audiences for deep-link guards. */
const ROUTE_AUDIENCE_BY_PATH: Partial<Record<string, RouteAudience>> = {
  [paths.dashboard]: 'shared',
  [paths.myPreceptorship]: 'guardian',
  [paths.myReportCards]: 'guardian',
  [paths.myTaxDeclarations]: 'guardian',
  [paths.myCharges]: 'guardian',
  [paths.myRequests]: 'guardian',
  [paths.guardians]: 'staff',
  [paths.students]: 'staff',
  [paths.users]: 'staff',
  [paths.collaborators]: 'staff',
  [paths.lessons]: 'staff',
  [paths.grades]: 'staff',
  [paths.schoolClasses]: 'staff',
  [paths.subjects]: 'staff',
  [paths.jobPositions]: 'staff',
  [paths.preceptorship]: 'staff',
  [paths.reportCards]: 'staff',
  [paths.requests]: 'staff',
  [paths.charges]: 'staff',
  [paths.plans]: 'staff',
  [paths.billingSettings]: 'staff',
  [paths.serviceInvoices]: 'staff',
  [paths.contractTemplate]: 'staff',
};

export const menuItemModuleKey = (item: MenuItem): SchoolModuleKey | null =>
  SITEMAP_MODULE_BY_ID[item.id] ?? null;

export const routeModuleKeyForPath = (pathname: string): SchoolModuleKey | null =>
  ROUTE_MODULE_BY_PATH[pathname] ?? null;

export const routeAudienceForPath = (pathname: string): RouteAudience | null =>
  ROUTE_AUDIENCE_BY_PATH[pathname] ?? null;

/** When `enabled_modules` is absent, legacy payloads keep all module-gated items visible. */
export const isModuleEnabledForMembership = (
  membership: Membership | null,
  moduleKey: SchoolModuleKey,
): boolean => {
  if (!membership?.enabled_modules) {
    return true;
  }

  return membership.enabled_modules.includes(moduleKey);
};

/** Shared filter for sidebar nav and global search so module gating cannot drift. */
export const visibleMenuItems = (membership: Membership | null, items: MenuItem[]): MenuItem[] =>
  items.filter((item) => {
    if (!membershipMatchesAudience(membership, item.audience)) {
      return false;
    }

    const moduleKey = menuItemModuleKey(item);
    if (moduleKey && !isModuleEnabledForMembership(membership, moduleKey)) {
      return false;
    }

    if (!item.requiredPermission) {
      return true;
    }

    return membership !== null && membershipHasPermission(membership, item.requiredPermission);
  });

export const visibleSitemap = (membership: Membership | null): MenuItem[] =>
  visibleMenuItems(membership, sitemap);

export const isStaffRouteForMembership = (
  pathname: string,
  membership: Membership | null,
): boolean => {
  const audience = routeAudienceForPath(pathname);

  if (!audience || audience === 'shared' || !membership) {
    return false;
  }

  return audience === 'staff' && membershipAudience(membership) === 'guardian';
};

export const isGuardianRouteForMembership = (
  pathname: string,
  membership: Membership | null,
): boolean => {
  const audience = routeAudienceForPath(pathname);

  if (!audience || audience === 'shared' || !membership) {
    return false;
  }

  return audience === 'guardian' && membershipAudience(membership) === 'staff';
};
