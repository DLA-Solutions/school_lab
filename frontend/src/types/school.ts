/** Mirrors `SchoolBlueprint` (web/app/blueprints/school_blueprint.rb). */
export interface School {
  id: number;
  name: string;
  cnpj: string | null;
  address: string | null;
  saas_plan: string | null;
  school_group_id: number | null;
}

export interface SchoolPayload {
  name: string;
  cnpj?: string | null;
  address?: string | null;
  saas_plan?: string | null;
}
