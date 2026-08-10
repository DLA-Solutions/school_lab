import { describe, expect, it } from 'vitest';
import { ownerPendingUser, staffUser } from 'test/msw/handlers';
import {
  findInvitedMembership,
  findPendingHandoffOwnerMembership,
  onboardingRedirectPath,
} from 'utils/onboarding/access';
import paths from 'routes/paths';

describe('onboarding access helpers', () => {
  it('finds invited membership', () => {
    const invited = {
      ...staffUser.memberships[0],
      status: 'invited',
    };

    expect(findInvitedMembership({ ...staffUser, memberships: [invited] })?.status).toBe('invited');
  });

  it('finds pending handoff owner membership', () => {
    expect(findPendingHandoffOwnerMembership(ownerPendingUser)?.is_owner).toBe(true);
  });

  it('redirects invited users away from main app routes', () => {
    const invited = {
      ...staffUser.memberships[0],
      status: 'invited',
    };

    expect(onboardingRedirectPath({ ...staffUser, memberships: [invited] }, paths.dashboard)).toBe(
      paths.inviteAccept,
    );
  });

  it('redirects pending handoff owners to wizard', () => {
    expect(onboardingRedirectPath(ownerPendingUser, paths.dashboard)).toBe(paths.ownerOnboarding);
  });

  it('allows active school access', () => {
    expect(onboardingRedirectPath(staffUser, paths.dashboard)).toBeNull();
  });
});
