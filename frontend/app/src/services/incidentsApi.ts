import { IncidentCreatePayload, IncidentListResponse, IncidentResponse } from 'types/incidents';
import { request, requestBlob } from './api';

/**
 * "Ata" (BC7) as staff work it. Routes land under `academics` (see `web/config/routes.rb`) —
 * a teacher's own classes, or school-wide for staff who hold `manage_academic`
 * (`IncidentPolicy`).
 */
const base = (schoolId: number) => `/api/v1/schools/${schoolId}/academics/incidents`;

export interface ListIncidentsParams {
  /** One-based, as Pagy counts pages. */
  page?: number;
  /** Narrows the grid to one student's record. */
  studentId?: number;
  /**
   * BR-IN10 — narrows the grid to one author's atas, including the caller's own
   * `membership_id` for the "minhas atas" shortcut. Only has effect for `manage_academic`
   * staff; a `teacher`-role caller's result is already their own incidents only, so the API
   * ignores the param for them (`IncidentPolicy#manage_academic_staff?`).
   */
  reportedByMembershipId?: number;
}

/** GET .../academics/incidents — `policy_scope`'d server-side (own classes vs. whole school). */
export const listIncidents = (
  schoolId: number,
  { page = 1, studentId, reportedByMembershipId }: ListIncidentsParams = {},
) => {
  const query = new URLSearchParams({ page: String(page) });
  if (studentId !== undefined) {
    query.set('student_id', String(studentId));
  }
  if (reportedByMembershipId !== undefined) {
    query.set('reported_by_membership_id', String(reportedByMembershipId));
  }

  return request<IncidentListResponse>(`${base(schoolId)}?${query}`);
};

/**
 * POST .../academics/incidents — UC-IN01. Refused with `403` when the student is outside the
 * teacher's assigned classes (BR-IN03) — `IncidentPolicy#assignable_student?` on the API side.
 * `payload.guardian_ids` (BR-IN11) is optional — omitted, the API snapshots the student's
 * current guardians on its own.
 */
export const createIncident = async (
  schoolId: number,
  payload: IncidentCreatePayload,
): Promise<IncidentResponse['data']> => {
  const response = await request<IncidentResponse>(base(schoolId), {
    method: 'POST',
    body: { incident: payload },
  });

  return response.data;
};

/**
 * POST .../academics/incidents/:id/approve — UC-IN03/BR-IN08. Fills whichever of the two
 * approval slots matches the requester's role template; `403` when it is neither `coordination`
 * nor `director` (AC-IN05).
 */
export const approveIncident = async (schoolId: number, id: number): Promise<IncidentResponse['data']> => {
  const response = await request<IncidentResponse>(`${base(schoolId)}/${id}/approve`, {
    method: 'POST',
    body: {},
  });

  return response.data;
};

/**
 * POST .../academics/incidents/:id/publish — UC-IN02. `409` when the incident's visibility is
 * `staff_only` (BR-IN02 — that visibility never publishes).
 */
export const publishIncident = async (schoolId: number, id: number): Promise<IncidentResponse['data']> => {
  const response = await request<IncidentResponse>(`${base(schoolId)}/${id}/publish`, {
    method: 'POST',
    body: {},
  });

  return response.data;
};

/**
 * GET .../academics/incidents/:id/pdf — the same document a guardian would be shown
 * (`Academic::RenderIncidentPdfService`), rendered inline. `IncidentPolicy#show?` gates it: a
 * teacher outside the incident's class gets `403`, a cross-school id `404`s via the tenant-scoped
 * lookup itself.
 */
export const fetchIncidentPdf = (schoolId: number, id: number): Promise<Blob> =>
  requestBlob(`${base(schoolId)}/${id}/pdf`);
