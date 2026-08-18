import { AuthUser } from 'types/auth';

const backofficeMembership = (user: AuthUser | null | undefined) =>
  user?.memberships.find((membership) => membership.role === 'backoffice');

export const hasPlatformPermission = (
  user: AuthUser | null | undefined,
  permission: string,
): boolean => {
  const permissions = backofficeMembership(user)?.platform_permissions ?? [];

  return permissions.includes(permission);
};

export const canManageBackofficeOps = (user: AuthUser | null | undefined): boolean =>
  hasPlatformPermission(user, 'manage_backoffice_ops');
