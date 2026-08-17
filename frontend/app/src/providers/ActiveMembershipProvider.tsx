import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Membership } from 'types/auth';
import paths from 'routes/paths';
import {
  clearStoredActiveMembershipId,
  getStoredActiveMembershipId,
  setStoredActiveMembershipId,
} from 'services/activeMembershipStore';
import { isEligibleMembership, reconcileActiveMembership } from 'utils/membership/audience';
import { useAuth } from './AuthContext';
import { ActiveMembershipContext } from './ActiveMembershipContext';

const ActiveMembershipProvider = ({ children }: PropsWithChildren) => {
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const [selectionVersion, setSelectionVersion] = useState(0);

  const eligibleMemberships = useMemo(
    () => user?.memberships.filter(isEligibleMembership) ?? [],
    [user],
  );

  const activeMembership = useMemo(() => {
    if (!user) {
      return null;
    }

    // `selectionVersion` forces a re-read after an explicit switch writes to storage.
    void selectionVersion;

    return reconcileActiveMembership(user.memberships, getStoredActiveMembershipId());
  }, [selectionVersion, user]);

  useEffect(() => {
    if (status === 'unauthenticated' || !activeMembership) {
      clearStoredActiveMembershipId();
      return;
    }

    if (getStoredActiveMembershipId() !== activeMembership.id) {
      setStoredActiveMembershipId(activeMembership.id);
    }
  }, [activeMembership, status]);

  const selectMembership = useCallback(
    (membership: Membership) => {
      setStoredActiveMembershipId(membership.id);
      setSelectionVersion((version) => version + 1);
      navigate(paths.dashboard, { replace: true });
    },
    [navigate],
  );

  const value = useMemo(
    () => ({
      activeMembership,
      eligibleMemberships,
      selectMembership,
    }),
    [activeMembership, eligibleMemberships, selectMembership],
  );

  return (
    <ActiveMembershipContext.Provider value={value}>{children}</ActiveMembershipContext.Provider>
  );
};

export default ActiveMembershipProvider;
