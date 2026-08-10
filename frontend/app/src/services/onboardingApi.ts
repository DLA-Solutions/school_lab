import { Membership } from 'types/auth';
import {
  CreateStaffInvitePayload,
  CreatedMembership,
  HandoffPayload,
  HandoffResponse,
  InviteAcceptPayload,
  InviteAcceptResponse,
  MembershipAcceptResponse,
} from 'types/onboarding';
import { listRoleTemplates as fetchRoleTemplates } from './peopleApi';
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

/** POST /api/v1/schools/:id/handoff — activation for self-serve owner wizard. */
export const submitHandoff = async (schoolId: number, payload: HandoffPayload = {}) => {
  const response = await request<HandoffResponse>(`/api/v1/schools/${schoolId}/handoff`, {
    method: 'POST',
    body: payload,
  });

  return response.data;
};

/** GET /api/v1/schools/:school_id/role_templates — secretary template for team invites. */
export const listRoleTemplates = fetchRoleTemplates;

/** POST /api/v1/schools/:school_id/people/memberships — invite staff during owner wizard. */
export const inviteStaffMember = async (schoolId: number, payload: CreateStaffInvitePayload) => {
  const response = await request<{ data: CreatedMembership }>(
    `/api/v1/schools/${schoolId}/people/memberships`,
    { method: 'POST', body: payload },
  );

  return response.data;
};
