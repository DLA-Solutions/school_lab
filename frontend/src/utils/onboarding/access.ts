import { AuthUser, Membership } from 'types/auth';
import paths from 'routes/paths';

export const isBackofficeUser = (memberships: Membership[]): boolean =>
  memberships.some((membership) => membership.role === 'backoffice' && membership.status === 'active');

export const findInvitedMembership = (user: AuthUser | null): Membership | undefined =>
  user?.memberships.find((membership) => membership.status === 'invited');

/** Owner on a school that has not finished onboarding activation. */
export const findPendingHandoffOwnerMembership = (
  user: AuthUser | null,
): Membership | undefined =>
  user?.memberships.find(
    (membership) =>
      membership.status === 'active' &&
      membership.is_owner === true &&
      membership.school_onboarding_status === 'pending_handoff',
  );

/**
 * Where onboarding guards should send the user, or null when the current route is allowed.
 * `pathname` is the router location without the Vite basename.
 */
export const onboardingRedirectPath = (
  user: AuthUser | null,
  pathname: string,
): string | null => {
  if (!user) {
    return null;
  }

  const invited = findInvitedMembership(user);
  if (invited && !pathname.startsWith(paths.inviteAccept)) {
    return paths.inviteAccept;
  }

  const pendingOwner = findPendingHandoffOwnerMembership(user);
  if (pendingOwner && !pathname.startsWith(paths.ownerOnboarding)) {
    return paths.ownerOnboarding;
  }

  return null;
};

export const membershipHasPermission = (membership: Membership, permission: string): boolean =>
  membership.permissions.includes(permission);
