import { useMemo } from 'react';
import { Membership } from 'types/auth';
import { useActiveMembership } from './ActiveMembershipContext';
import { isStaffMembership } from 'utils/membership/audience';

/**
 * The school whose staff endpoints the signed-in user may call in the **active** context.
 *
 * Returns the active membership only when it is a staff or teacher role. In guardian context this
 * is intentionally null so staff screens cannot accidentally call `staff_with?` endpoints.
 */
export const useCurrentSchool = (): Membership | null => {
  const activeMembership = useActiveMembership();

  return useMemo(() => {
    if (!activeMembership || !isStaffMembership(activeMembership)) {
      return null;
    }

    return activeMembership;
  }, [activeMembership]);
};

export default useCurrentSchool;
