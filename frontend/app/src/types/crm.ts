/** Lead temperature — `cold` = frio, `warm` = morno, `hot` = quente (docs/api/v1/crm.md). */
export type CrmTemperature = 'cold' | 'warm' | 'hot';

export const CRM_TEMPERATURES: readonly CrmTemperature[] = ['cold', 'warm', 'hot'];

/** `summary` view of `CrmContactBlueprint` — what the index action returns. */
export interface CrmContact {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  temperature: CrmTemperature;
}

/** `detail` view — adds the tenant and timestamps; returned by show/create/update. */
export interface CrmContactDetail extends CrmContact {
  school_id: number;
  created_at: string;
  updated_at: string;
}

/** Writable attributes of `crm_contact_params`; only `name` is required on create. */
export interface CrmContactPayload {
  name?: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  temperature?: CrmTemperature;
}

/** Pagy metadata returned by the index action. */
export interface CrmContactListMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface CrmContactListResponse {
  data: CrmContact[];
  meta: CrmContactListMeta;
}

export interface CrmContactResponse {
  data: CrmContactDetail;
}
