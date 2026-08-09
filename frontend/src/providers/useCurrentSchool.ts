import { useMemo } from 'react';
import { Membership } from 'types/auth';
import { useAuth } from './AuthContext';

/**
 * The school whose staff endpoints the signed-in user may call.
 *
 * Every `/api/v1/schools/:school_id/...` route resolves its context from the path, and the
 * People endpoints are guarded by `school_staff?` — a `guardian` membership gets a 403. So the
 * only membership that can drive these screens is an active one with role `school`.
 *
 * There is no school switcher yet: a user with staff memberships in more than one school lands
 * on the first. Replace this with a selection stored in context when that case becomes real.
 */
export const useCurrentSchool = (): Membership | null => {
  const { user } = useAuth();

  return useMemo(
    () =>
      user?.memberships.find(
        (membership) => membership.role === 'school' && membership.status === 'active',
      ) ?? null,
    [user],
  );
};

export default useCurrentSchool;
