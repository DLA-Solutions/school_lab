import { IncidentCreatePayload, IncidentListResponse, IncidentResponse } from 'types/incidents';
import { request } from './api';

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
}

/** GET .../academics/incidents — `policy_scope`'d server-side (own classes vs. whole school). */
export const listIncidents = (schoolId: number, { page = 1, studentId }: ListIncidentsParams = {}) => {
  const query = new URLSearchParams({ page: String(page) });
  if (studentId !== undefined) {
    query.set('student_id', String(studentId));
  }

  return request<IncidentListResponse>(`${base(schoolId)}?${query}`);
};

/**
 * POST .../academics/incidents — UC-IN01. Refused with `403` when the student is outside the
 * teacher's assigned classes (BR-IN03) — `IncidentPolicy#assignable_student?` on the API side.
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
