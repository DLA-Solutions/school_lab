import { useMemo } from 'react';
import { Membership } from 'types/auth';
import { useAuth } from './AuthContext';

/**
 * The school whose `me` endpoints the signed-in guardian may call.
 *
 * The sibling `useCurrentSchool` is staff-only on purpose — every screen it drives calls an
 * endpoint guarded by `staff_with?`, which answers a guardian membership with a 403. The guardian
 * routes under `/api/v1/schools/:school_id/me/...` are the mirror of that: they refuse anything
 * that is not a guardian. So the two need different memberships, and one hook returning "whatever
 * membership is active" would hand each screen the wrong one half the time.
 *
 * As with the staff hook, there is no school switcher: a guardian with children at two schools
 * lands on the first.
 */
export const useGuardianSchool = (): Membership | null => {
  const { user } = useAuth();

  return useMemo(
    () =>
      user?.memberships.find(
        (membership) => membership.role === 'guardian' && membership.status === 'active',
      ) ?? null,
    [user],
  );
};

export default useGuardianSchool;
