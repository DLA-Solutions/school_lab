/** Mirrors `SchoolGroupBlueprint`. */
export interface SchoolGroup {
  id: number;
  name: string;
  headquarters_cnpj: string | null;
  schools_count: number;
  created_at: string;
  updated_at: string;
}

/** Summary row from GET /platform/school_groups/:id/schools. */
export interface SchoolGroupMember {
  id: number;
  name: string;
  onboarding_status: string | null;
}

export interface SchoolGroupPayload {
  name: string;
  headquarters_cnpj?: string | null;
}
