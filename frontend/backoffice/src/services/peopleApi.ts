import { Paginated } from 'types/academics';
import { Membership } from 'types/auth';
import { request } from './api';

const membershipsPath = (schoolId: number) => `/api/v1/schools/${schoolId}/people/memberships`;

/** GET /api/v1/schools/:school_id/people/memberships — Pagy, 25 per page. */
export const listMemberships = (schoolId: number, page = 1) =>
  request<Paginated<Membership>>(`${membershipsPath(schoolId)}?page=${page}`);
