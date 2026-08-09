/** Mirrors `GuardianBlueprint` (web/app/blueprints/guardian_blueprint.rb). */
export interface Guardian {
  id: number;
  school_id: number;
  user_id: number | null;
  name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
}

/** Writable attributes of `guardian_params` — only `name` is required by the API. */
export interface GuardianPayload {
  name: string;
  cpf?: string | null;
  email?: string | null;
  phone?: string | null;
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
