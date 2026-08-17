import { useMemo } from 'react';
import { Membership } from 'types/auth';
import { useActiveMembership } from './ActiveMembershipContext';
import { isGuardianMembership } from 'utils/membership/audience';

/**
 * The school whose `me` endpoints the signed-in user may call in the **active** context.
 *
 * Returns the active membership only when it is a guardian role. In staff context this is
 * intentionally null so guardian screens cannot call family-scoped routes with the wrong profile.
 */
export const useGuardianSchool = (): Membership | null => {
  const activeMembership = useActiveMembership();

  return useMemo(() => {
    if (!activeMembership || !isGuardianMembership(activeMembership)) {
      return null;
    }

    return activeMembership;
  }, [activeMembership]);
};

export default useGuardianSchool;
