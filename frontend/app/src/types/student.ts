/** Mirrors `StudentBlueprint` (web/app/blueprints/student_blueprint.rb). */
export interface Student {
  id: number;
  school_id: number;
  name: string;
  /** Canonical 11 digits — format with `formatCpf` for display. */
  cpf: string;
  rg: string;
  /** ISO date (`2015-03-10`). */
  birth_date: string;
  /** Read from the cohort the student is enrolled into; not stored on the student. */
  grade_level: string | null;
  school_class_id: number | null;
  school_class_name: string | null;
  guardians: StudentGuardianLink[];
  status: 'active' | 'transferred';
  /** False once removed from the roll — drives the "Ativar" action. */
  active: boolean;
}

/** A parent (or other responsible adult) attached to the student. */
export interface StudentGuardianLink {
  id: number;
  link_id: number;
  name: string;
  cpf: string;
  relationship: 'father' | 'mother' | 'other';
}

/**
 * Writable attributes of `student_params`. `status` defaults to `active` on the API.
 *
 * The parents are identified by CPF rather than by id — the school knows the document. At least
 * one must be present, and each must already match a registered guardian.
 */
export interface StudentPayload {
  name: string;
  cpf: string;
  rg: string;
  birth_date: string;
  school_class_id: number;
  father_cpf?: string | null;
  mother_cpf?: string | null;
  status?: string;
}

export interface StudentListMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface StudentListResponse {
  data: Student[];
  meta: StudentListMeta;
}

export interface StudentResponse {
  data: Student;
}
