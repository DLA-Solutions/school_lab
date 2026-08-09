/**
 * The address is optional as a whole, but the API rejects a partially filled one — every field
 * except `complement` must be present once any of them is.
 */
export interface GuardianAddress {
  zip_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

/** Mirrors `GuardianBlueprint` (web/app/blueprints/guardian_blueprint.rb). */
export interface Guardian extends GuardianAddress {
  id: number;
  school_id: number;
  user_id: number | null;
  name: string;
  /** Canonical 11 digits — format with `formatCpf` for display. */
  cpf: string;
  email: string;
  phone: string;
}

/** Writable attributes of `guardian_params`. Name, CPF, e-mail and phone are all required. */
export interface GuardianPayload extends Partial<GuardianAddress> {
  name: string;
  cpf: string;
  email: string;
  phone: string;
}

/** Pagy metadata returned by the index action. */
export interface GuardianListMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface GuardianListResponse {
  data: Guardian[];
  meta: GuardianListMeta;
}

export interface GuardianResponse {
  data: Guardian;
}
