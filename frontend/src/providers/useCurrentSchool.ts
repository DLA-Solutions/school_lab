import { useMemo } from 'react';
import { Membership } from 'types/auth';
import { useAuth } from './AuthContext';

/** Active roles that may call school-scoped staff endpoints (`staff_with?` on the API). */
const STAFF_MEMBERSHIP_ROLES = new Set(['staff', 'teacher', 'school']);

/**
 * The school whose staff endpoints the signed-in user may call.
 *
 * Every `/api/v1/schools/:school_id/...` route resolves its context from the path, and the
 * People endpoints are guarded by `staff_with?` — a `guardian` membership gets a 403. So the
 * only membership that can drive these screens is an active one with role `staff` or `teacher`
 * (legacy `school` is still accepted until migration completes).
 *
 * There is no school switcher yet: a user with staff memberships in more than one school lands
 * on the first. Replace this with a selection stored in context when that case becomes real.
 */
export const useCurrentSchool = (): Membership | null => {
  const { user } = useAuth();

  return useMemo(
    () =>
      user?.memberships.find(
        (membership) =>
          STAFF_MEMBERSHIP_ROLES.has(membership.role) && membership.status === 'active',
      ) ?? null,
    [user],
  );
};

export default useCurrentSchool;
