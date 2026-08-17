import { createContext, useContext } from 'react';
import { Membership } from 'types/auth';

export interface ActiveMembershipContextValue {
  /** Resolved membership from the latest `/me` payload, or null when none is eligible. */
  activeMembership: Membership | null;
  /** All active memberships the signed-in user may switch to. */
  eligibleMemberships: Membership[];
  selectMembership: (membership: Membership) => void;
}

export const ActiveMembershipContext = createContext<ActiveMembershipContextValue | null>(null);

export const useActiveMembershipContext = () => {
  const context = useContext(ActiveMembershipContext);

  if (!context) {
    throw new Error('useActiveMembershipContext must be used within ActiveMembershipProvider');
  }

  return context;
};

/** Active membership for navigation, API school scope, and profile context. */
export const useActiveMembership = (): Membership | null =>
  useActiveMembershipContext().activeMembership;
