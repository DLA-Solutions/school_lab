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

/** Papéis que uma conta pode ter. `staff` e `teacher` exigem um perfil de permissões. */
export type MembershipRoleInput = 'staff' | 'teacher' | 'guardian';

export interface CreateMembershipInput {
  email: string;
  role: MembershipRoleInput;
  /** Obrigatório para equipe e professor; ignorado para família. */
  role_template_id?: number | null;
  display_title?: string | null;
}

/**
 * POST .../people/memberships — cria a conta já convidada.
 *
 * A conta nasce em "convidado": o acesso é aceito por quem recebe o e-mail, e não por quem
 * cadastra. A escola não escolhe a senha de ninguém.
 */
export const createMembership = async (schoolId: number, input: CreateMembershipInput) => {
  const response = await request<{ data: TeamMembership }>(
    membershipsPath(schoolId),
    { method: 'POST', body: { membership: input } },
  );

  return response.data;
};

/** POST .../people/memberships/:id/invite — reenvia o convite que se perdeu. */
export const resendMembershipInvite = async (schoolId: number, membershipId: number) => {
  const response = await request<{ data: TeamMembership }>(
    `${membershipsPath(schoolId)}/${membershipId}/invite`,
    { method: 'POST', body: {} },
  );

  return response.data;
};
