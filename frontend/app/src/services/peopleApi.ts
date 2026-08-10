import { Paginated } from 'types/academics';
import {
  MembershipListResponse,
  MembershipOverridesPayload,
  MembershipPermissionsResponse,
  PermissionDefinitionsResponse,
  RoleTemplateDetail,
  TeamMembership,
} from 'types/people';
import { request } from './api';

const membershipsPath = (schoolId: number) => `/api/v1/schools/${schoolId}/people/memberships`;

/** GET /api/v1/schools/:school_id/people/memberships — Pagy, 25 per page. */
export const listMemberships = (schoolId: number, page = 1) =>
  request<MembershipListResponse>(`${membershipsPath(schoolId)}?page=${page}`);

/** PATCH /api/v1/schools/:school_id/people/memberships/:id/permissions — owner only. */
export const updateMembershipPermissions = async (
  schoolId: number,
  membershipId: number,
  payload: MembershipOverridesPayload,
): Promise<TeamMembership> => {
  const response = await request<MembershipPermissionsResponse>(
    `${membershipsPath(schoolId)}/${membershipId}/permissions`,
    { method: 'PATCH', body: payload },
  );

  return response.data;
};

/** GET /api/v1/schools/:school_id/permission_definitions */
export const listPermissionDefinitions = (schoolId: number) =>
  request<PermissionDefinitionsResponse>(`/api/v1/schools/${schoolId}/permission_definitions`);

/** GET /api/v1/schools/:school_id/role_templates — detail view with permissions[]. */
export const listRoleTemplates = (schoolId: number) =>
  request<Paginated<RoleTemplateDetail>>(
    `/api/v1/schools/${schoolId}/role_templates?page=1&per_page=50`,
  );
