import { Membership, SchoolModuleKey } from 'types/auth';
import paths from 'routes/paths';
import sitemap, { MenuItem } from 'routes/sitemap';
import { membershipHasPermission } from 'utils/onboarding/access';

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
  'contract-template': 'billing',
};

/** Maps SPA paths to module keys for deep-link route guards (includes off-menu academic routes). */
const ROUTE_MODULE_BY_PATH: Partial<Record<string, SchoolModuleKey>> = {
  [paths.charges]: 'billing',
  [paths.plans]: 'billing',
  [paths.billingSettings]: 'billing',
  [paths.contractTemplate]: 'billing',
  [paths.students]: 'academic',
  [paths.guardians]: 'academic',
  [paths.lessons]: 'academic',
  [paths.schoolClasses]: 'academic',
  [paths.subjects]: 'academic',
  [paths.collaborators]: 'academic',
  [paths.jobPositions]: 'academic',
};

export const menuItemModuleKey = (item: MenuItem): SchoolModuleKey | null =>
  SITEMAP_MODULE_BY_ID[item.id] ?? null;

export const routeModuleKeyForPath = (pathname: string): SchoolModuleKey | null =>
  ROUTE_MODULE_BY_PATH[pathname] ?? null;

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
