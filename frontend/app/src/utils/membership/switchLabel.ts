import { Membership } from 'types/auth';
import type { MessageKey } from 'locales';
import { membershipDisplayRole } from './audience';

type TranslateFn = (key: MessageKey, params?: Record<string, string | number>) => string;

export const membershipSwitchPrimary = (membership: Membership, t: TranslateFn): string =>
  membershipDisplayRole(membership, t);

const switchCollisionKey = (membership: Membership, t: TranslateFn): string => {
  const primary = membershipSwitchPrimary(membership, t);
  const secondary = membership.school_name ?? '';

  return `${primary}\0${secondary}`;
};

const hasSwitchLabelCollision = (
  membership: Membership,
  t: TranslateFn,
  siblings: Membership[],
): boolean =>
  siblings.some(
    (other) => other.id !== membership.id && switchCollisionKey(other, t) === switchCollisionKey(membership, t),
  );

/** School name for the profile switcher; appends school id when labels collide. */
export const membershipSwitchSecondary = (
  membership: Membership,
  t: TranslateFn,
  siblings: Membership[],
): string | undefined => {
  const schoolName = membership.school_name ?? undefined;

  if (!schoolName) {
    return undefined;
  }

  if (hasSwitchLabelCollision(membership, t, siblings)) {
    return t('membership.switchSecondaryWithId', {
      schoolName,
      schoolId: membership.school_id,
    });
  }

  return schoolName;
};
