import {
  CrmContactDetail,
  CrmContactListResponse,
  CrmContactPayload,
  CrmContactResponse,
  CrmTemperature,
} from 'types/crm';
import { request } from './api';

/** Tenant-scoped: the API resolves the school from the `school_id` path segment. */
const collectionPath = (schoolId: number) => `/api/v1/schools/${schoolId}/crm_contacts`;

const memberPath = (schoolId: number, id: number) => `${collectionPath(schoolId)}/${id}`;

export interface ListCrmContactsParams {
  schoolId: number;
  /** One-based, as Pagy counts pages. */
  page?: number;
  /** Case-insensitive substring over name, e-mail and phone. */
  q?: string;
  temperature?: CrmTemperature;
}

/** GET /api/v1/schools/:school_id/crm_contacts — ordered by name, 25 per page. */
export const listCrmContacts = ({ schoolId, page = 1, q, temperature }: ListCrmContactsParams) => {
  const query = new URLSearchParams({ page: String(page) });
  if (q?.trim()) {
    query.set('q', q.trim());
  }
  if (temperature) {
    query.set('temperature', temperature);
  }

  return request<CrmContactListResponse>(`${collectionPath(schoolId)}?${query}`);
};

/** POST /api/v1/schools/:school_id/crm_contacts */
export const createCrmContact = async (
  schoolId: number,
  crmContact: CrmContactPayload,
): Promise<CrmContactDetail> => {
  const response = await request<CrmContactResponse>(collectionPath(schoolId), {
    method: 'POST',
    body: { crm_contact: crmContact },
  });

  return response.data;
};

/** PATCH /api/v1/schools/:school_id/crm_contacts/:id */
export const updateCrmContact = async (
  schoolId: number,
  id: number,
  crmContact: CrmContactPayload,
): Promise<CrmContactDetail> => {
  const response = await request<CrmContactResponse>(memberPath(schoolId, id), {
    method: 'PATCH',
    body: { crm_contact: crmContact },
  });

  return response.data;
};

/** DELETE /api/v1/schools/:school_id/crm_contacts/:id — soft delete, `204`. */
export const deleteCrmContact = (schoolId: number, id: number) =>
  request<null>(memberPath(schoolId, id), { method: 'DELETE' });
