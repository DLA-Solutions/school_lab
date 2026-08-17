import { ReactElement } from 'react';
import { vi } from 'vitest';
import { Membership } from 'types/auth';
import {
  ActiveMembershipContext,
  ActiveMembershipContextValue,
} from 'providers/ActiveMembershipContext';
import { reconcileActiveMembership, isEligibleMembership } from 'utils/membership/audience';

export const activeMembershipValueFor = (
  memberships: Membership[],
  selectedId?: number | null,
): ActiveMembershipContextValue => {
  const eligibleMemberships = memberships.filter(isEligibleMembership);
  const activeMembership = reconcileActiveMembership(memberships, selectedId ?? null);

  return {
    activeMembership,
    eligibleMemberships,
    selectMembership: vi.fn(),
  };
};

export const withActiveMembership =
  (memberships: Membership[], selectedId?: number | null) =>
  (ui: ReactElement) => (
    <ActiveMembershipContext.Provider value={activeMembershipValueFor(memberships, selectedId)}>
      {ui}
    </ActiveMembershipContext.Provider>
  );
