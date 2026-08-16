import {
  GuardianRequestInput,
  GuardianRequestListResponse,
  GuardianRequestResponse,
} from 'types/guardianRequest';
import { request } from './api';

/** The school's queue. */
const queuePath = (schoolId: number) => `/api/v1/schools/${schoolId}/requests`;

/** A guardian's own asks. */
const minePath = (schoolId: number) => `/api/v1/schools/${schoolId}/me/requests`;

export interface QueueFilters {
  /** `open` is the two working states as one pile — what the screen lands on. */
  status?: string;
  kind?: string;
  page?: number;
}

const query = ({ status, kind, page }: QueueFilters) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (kind) params.set('kind', kind);
  if (page && page > 1) params.set('page', String(page));

  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
};

/** GET /api/v1/schools/:school_id/requests */
export const listRequests = (schoolId: number, filters: QueueFilters = {}) =>
  request<GuardianRequestListResponse>(`${queuePath(schoolId)}${query(filters)}`);

/** POST /api/v1/schools/:school_id/requests — staff writing down a telephoned ask. */
export const createRequestForGuardian = async (schoolId: number, input: GuardianRequestInput) => {
  const response = await request<GuardianRequestResponse>(queuePath(schoolId), {
    method: 'POST',
    body: { guardian_request: input },
  });

  return response.data;
};

/**
 * The four ways a request moves. They are separate endpoints rather than a status field because
 * the school works one shared queue: claiming is a claim, and answering records who answered.
 */
export type RequestAction = 'start' | 'release' | 'fulfill' | 'reject';

/** POST /api/v1/schools/:school_id/requests/:id/:action */
export const actOnRequest = async (
  schoolId: number,
  id: number,
  action: RequestAction,
  resolutionNote?: string,
) => {
  const response = await request<GuardianRequestResponse>(
    `${queuePath(schoolId)}/${id}/${action}`,
    { method: 'POST', body: resolutionNote ? { resolution_note: resolutionNote } : {} },
  );

  return response.data;
};

/** GET /api/v1/schools/:school_id/me/requests */
export const listMyRequests = (schoolId: number, page = 1) =>
  request<GuardianRequestListResponse>(`${minePath(schoolId)}${page > 1 ? `?page=${page}` : ''}`);

/** POST /api/v1/schools/:school_id/me/requests — the guardian asking for themselves. */
export const createMyRequest = async (schoolId: number, input: GuardianRequestInput) => {
  const response = await request<GuardianRequestResponse>(minePath(schoolId), {
    method: 'POST',
    body: { guardian_request: input },
  });

  return response.data;
};
