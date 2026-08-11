import { Paginated } from 'types/academics';
import { Membership } from 'types/auth';
import { request } from './api';

const membershipsPath = (schoolId: number) => `/api/v1/schools/${schoolId}/people/memberships`;

/** GET /api/v1/schools/:school_id/people/memberships — Pagy, 25 per page. */
export const listMemberships = (schoolId: number, page = 1) =>
  request<Paginated<Membership>>(`${membershipsPath(schoolId)}?page=${page}`);

/** POST /api/v1/schools/:school_id/people/memberships/:id/invite — resend invite token. */
export const resendMembershipInvite = async (schoolId: number, membershipId: number) => {
  const response = await request<{ data: Membership }>(
    `${membershipsPath(schoolId)}/${membershipId}/invite`,
    { method: 'POST' },
  );

  return response.data;
};
