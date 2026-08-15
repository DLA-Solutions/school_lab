/**
 * A post a collaborator occupies. Mirrors `JobPositionBlueprint`.
 *
 * Distinct from a role template, which grants a user account its permissions: a job position says
 * what someone does, not what they may see.
 */
export interface JobPosition {
  id: number;
  school_id: number;
  name: string;
  /** True while collaborators still hold it — removal is refused until they move. */
  in_use: boolean;
  collaborator_count: number;
}

/** Mirrors `SubjectBlueprint` (web/app/blueprints/subject_blueprint.rb). */
export interface Subject {
  id: number;
  school_id: number;
  name: string;
}

/** Mirrors `SchoolClass::SHIFTS` — the time of day a cohort is taught. */
export type SchoolClassShift = 'matutino' | 'vespertino';

/** Mirrors `SchoolClassBlueprint` — a cohort: one grade, one year, one shift, one identifier. */
export interface SchoolClass {
  id: number;
  school_id: number;
  /** The cohort's identifier within the grade, e.g. "A". */
  name: string;
  /** One of `SchoolClass::GRADE_LEVELS` — see `utils/gradeLevels`. */
  grade_level: string;
  /** When the cohort is taught. Part of what tells two same-named cohorts apart. */
  shift: SchoolClassShift;
  year: number;
  student_count: number;
  /** Derived from the cohort's teaching assignments. */
  subjects: Subject[];
}

/** A class a teacher works in, with the subjects they hold there. */
export interface TeacherClass {
  id: number;
  name: string;
  grade_level: string;
  shift: SchoolClassShift;
  year: number;
  subjects: { id: number; name: string; assignment_id: number }[];
}

/**
 * A collaborator of the school. The API resource is still `teachers` — teaching assignments hang
 * off it — but the register covers every post, which `job_title` names.
 */
export interface Teacher {
  id: number;
  school_id: number;
  name: string;
  /** Canonical 11 digits — format with `formatCpf` for display. */
  cpf: string;
  email: string;
  phone: string | null;
  job_position_id: number;
  /** The post's name, denormalized by the blueprint so a listing reads without a join. */
  job_title: string | null;
  /** ISO date (`2024-02-01`), or null for a record that predates the field. */
  hired_on: string | null;
  classes: TeacherClass[];
}

/** Mirrors `TeachingAssignmentBlueprint` — one lesson: a teacher, a subject and a cohort. */
export interface TeachingAssignment {
  id: number;
  school_id: number;
  teacher_id: number;
  school_class_id: number;
  subject_id: number;
  teacher_name: string;
  subject_name: string;
  school_class: {
    id: number;
    name: string;
    grade_level: string;
    shift: SchoolClassShift;
    year: number;
    /** The cohort named in full, worded by the API so every screen says it the same way. */
    label: string;
  };
}

export interface TeacherPayload {
  name: string;
  cpf: string;
  email: string;
  phone?: string | null;
  job_position_id: number;
  hired_on?: string | null;
}

export interface SchoolClassPayload {
  name: string;
  grade_level: string;
  shift: SchoolClassShift;
  year: number;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; per_page: number; total: number };
}
