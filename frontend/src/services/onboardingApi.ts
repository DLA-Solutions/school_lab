import { Membership } from 'types/auth';
import {
  InviteAcceptPayload,
  InviteAcceptResponse,
  MembershipAcceptResponse,
} from 'types/onboarding';
import { parseMembership } from './parseAuthUser';
import { request } from './api';

/** POST /api/v1/auth/invite/accept — public; sets password from e-mail token. */
export const acceptInvite = (payload: InviteAcceptPayload) =>
  request<InviteAcceptResponse>('/api/v1/auth/invite/accept', {
    method: 'POST',
    auth: false,
    body: payload,
  });

/** POST /api/v1/me/memberships/:id/accept — activates an invited membership. */
export const acceptMembership = async (membershipId: number): Promise<Membership> => {
  const response = await request<MembershipAcceptResponse>(
    `/api/v1/me/memberships/${membershipId}/accept`,
    { method: 'POST' },
  );

  return parseMembership(response.data);
};
