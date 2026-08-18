import { Paginated } from 'types/academics';
import {
  CreateStaffInvitePayload,
  CreatedMembership,
  HandoffPayload,
  HandoffResponse,
  ProvisioningImportResult,
  RoleTemplateSummary,
} from 'types/onboarding';
import { request } from './api';

/** POST /api/v1/schools/:id/handoff — activation for self-serve owner wizard. */
export const submitHandoff = async (schoolId: number, payload: HandoffPayload = {}) => {
  const response = await request<HandoffResponse>(`/api/v1/schools/${schoolId}/handoff`, {
    method: 'POST',
    body: payload,
  });

  return response.data;
};

/** GET /api/v1/schools/:school_id/role_templates — secretary template for team invites. */
export const listRoleTemplates = (schoolId: number) =>
  request<Paginated<RoleTemplateSummary>>(
    `/api/v1/schools/${schoolId}/role_templates?page=1&per_page=50`,
  );

/** POST /api/v1/schools/:school_id/provisioning/import — CSV preview or commit during provisioning. */
export const importProvisioningCsv = async (
  schoolId: number,
  file: File,
  dryRun: boolean,
): Promise<ProvisioningImportResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request<{ data: ProvisioningImportResult }>(
    `/api/v1/schools/${schoolId}/provisioning/import?dry_run=${dryRun}`,
    { method: 'POST', body: formData },
  );

  return response.data;
};

export type ResendProvisioningInvitesResult = {
  resent_count: number;
};

/** POST /api/v1/schools/:id/provisioning/resend_invites — bulk re-queue pending invites (UC-BOE08). */
export const resendProvisioningInvites = async (schoolId: number) => {
  const response = await request<{ data: ResendProvisioningInvitesResult }>(
    `/api/v1/schools/${schoolId}/provisioning/resend_invites`,
    { method: 'POST' },
  );

  return response.data;
};

/** POST /api/v1/schools/:school_id/people/memberships — invite staff during owner wizard. */
export const inviteStaffMember = async (schoolId: number, payload: CreateStaffInvitePayload) => {
  const response = await request<{ data: CreatedMembership }>(
    `/api/v1/schools/${schoolId}/people/memberships`,
    { method: 'POST', body: payload },
  );

  return response.data;
};
