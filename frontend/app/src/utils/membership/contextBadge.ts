import { Membership } from 'types/auth';
import type { ContextBadgeVariant } from 'design-system';
import type { MessageKey } from 'locales';
import { membershipAudience } from './audience';
import { membershipSwitchPrimary, membershipSwitchSecondary } from './switchLabel';

type TranslateFn = (key: MessageKey, params?: Record<string, string | number>) => string;

export const membershipContextBadgeVariant = (membership: Membership): ContextBadgeVariant => {
  if (membershipAudience(membership) === 'guardian') {
    return 'guardian';
  }

  if (membership.role === 'teacher') {
    return 'teacher';
  }

  return 'staff';
};

export const membershipContextBadgeLabels = (
  membership: Membership,
  t: TranslateFn,
  siblings: Membership[],
): { label: string; secondaryLabel?: string } => ({
  label: membershipSwitchPrimary(membership, t),
  secondaryLabel: membershipSwitchSecondary(membership, t, siblings),
});

export const membershipContextBadgeTooltip = (
  membership: Membership,
  t: TranslateFn,
  siblings: Membership[],
): string => {
  const { label, secondaryLabel } = membershipContextBadgeLabels(membership, t, siblings);

  if (secondaryLabel) {
    return t('membership.contextTooltip', {
      role: label,
      school: secondaryLabel,
    });
  }

  return t('membership.contextTooltipRoleOnly', { role: label });
};
