import {
  Guardian,
  GuardianListResponse,
  GuardianPayload,
  GuardianResponse,
} from 'types/guardian';
import { request } from './api';

/**
 * Guardians are always scoped to a school: the API resolves `Current.school` from the
 * `school_id` path segment and rejects the request when the caller has no membership there
 * (`set_school_context!` in web/app/controllers/api/v1/base_controller.rb).
 */
const collectionPath = (schoolId: number) => `/api/v1/schools/${schoolId}/people/guardians`;

const memberPath = (schoolId: number, id: number) => `${collectionPath(schoolId)}/${id}`;

export interface ListGuardiansParams {
  schoolId: number;
  /** One-based, as Pagy counts pages. */
  page?: number;
  /** One term matched against both the name and the CPF. */
  q?: string;
  /** `active` (the default), `inactive` or `all`. */
  status?: 'active' | 'inactive' | 'all';
}

/** GET /api/v1/schools/:school_id/people/guardians — ordered by name, 25 per page. */
export const listGuardians = ({ schoolId, page = 1, q, status }: ListGuardiansParams) => {
  const query = new URLSearchParams({ page: String(page) });
  if (q?.trim()) {
    query.set('q', q.trim());
  }
  if (status && status !== 'active') {
    query.set('status', status);
  }

  return request<GuardianListResponse>(`${collectionPath(schoolId)}?${query}`);
};

/** POST /api/v1/schools/:school_id/people/guardians */
export const createGuardian = async (
  schoolId: number,
  guardian: GuardianPayload,
): Promise<Guardian> => {
  const response = await request<GuardianResponse>(collectionPath(schoolId), {
    method: 'POST',
    body: { guardian },
  });

  return response.data;
};

/** PATCH /api/v1/schools/:school_id/people/guardians/:id */
export const updateGuardian = async (
  schoolId: number,
  id: number,
  guardian: GuardianPayload,
): Promise<Guardian> => {
  const response = await request<GuardianResponse>(memberPath(schoolId, id), {
    method: 'PATCH',
    body: { guardian },
  });

  return response.data;
};

/** POST .../guardians/:id/activate — brings a deactivated guardian back. */
export const activateGuardian = async (schoolId: number, id: number): Promise<Guardian> => {
  const response = await request<GuardianResponse>(`${memberPath(schoolId, id)}/activate`, {
    method: 'POST',
  });

  return response.data;
};

/**
 * DELETE /api/v1/schools/:school_id/people/guardians/:id — a soft delete (`Discard::Model`),
 * so the record leaves the list but its charges and documents stay linked.
 */
export const deleteGuardian = (schoolId: number, id: number) =>
  request<null>(memberPath(schoolId, id), { method: 'DELETE' });
