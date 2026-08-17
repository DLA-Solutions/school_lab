import { Membership } from 'types/auth';
import type { MessageKey } from 'locales';

/** Routes and menus are scoped to one of these audiences. */
export type RouteAudience = 'staff' | 'guardian' | 'shared';

/** Active roles that may call school-scoped staff endpoints (`staff_with?` on the API). */
export const STAFF_MEMBERSHIP_ROLES = new Set(['staff', 'teacher', 'school']);

export const isEligibleMembership = (membership: Membership): boolean =>
  membership.status === 'active';

export const isStaffMembership = (membership: Membership): boolean =>
  STAFF_MEMBERSHIP_ROLES.has(membership.role);

export const isGuardianMembership = (membership: Membership): boolean =>
  membership.role === 'guardian';

export const membershipAudience = (membership: Membership): Exclude<RouteAudience, 'shared'> =>
  isGuardianMembership(membership) ? 'guardian' : 'staff';

export const membershipMatchesAudience = (
  membership: Membership | null,
  itemAudience: RouteAudience | undefined,
): boolean => {
  if (!membership) {
    return false;
  }

  const audience = itemAudience ?? 'staff';

  if (audience === 'shared') {
    return true;
  }

  return membershipAudience(membership) === audience;
};

type TranslateFn = (key: MessageKey) => string;

/** Product-facing role label — never expose raw API role values such as `guardian`. */
export const membershipDisplayRole = (membership: Membership, t: TranslateFn): string => {
  if (membership.display_title) {
    return membership.display_title;
  }

  if (membership.role === 'guardian') {
    return t('common.guardian');
  }

  if (membership.role === 'teacher') {
    return t('common.teacherRole');
  }

  if (membership.role_template?.name) {
    return membership.role_template.name;
  }

  return t('common.staffRole');
};

export const reconcileActiveMembership = (
  memberships: Membership[],
  storedId: number | null,
): Membership | null => {
  const eligible = memberships.filter(isEligibleMembership);

  if (eligible.length === 0) {
    return null;
  }

  if (storedId !== null) {
    const match = eligible.find((membership) => membership.id === storedId);
    if (match) {
      return match;
    }
  }

  if (eligible.length === 1) {
    return eligible[0];
  }

  // Multiple eligible memberships and no valid stored selection: pick a deterministic default
  // until the user chooses explicitly in the profile menu.
  return [...eligible].sort((left, right) => left.id - right.id)[0];
};
