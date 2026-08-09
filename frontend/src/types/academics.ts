/** Mirrors `SubjectBlueprint` (web/app/blueprints/subject_blueprint.rb). */
export interface Subject {
  id: number;
  school_id: number;
  name: string;
}

/** Mirrors `SchoolClassBlueprint` — a cohort: one grade, one year, one identifier. */
export interface SchoolClass {
  id: number;
  school_id: number;
  /** The cohort's identifier within the grade, e.g. "A". */
  name: string;
  /** One of `SchoolClass::GRADE_LEVELS` — see `utils/gradeLevels`. */
  grade_level: string;
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
  year: number;
  subjects: { id: number; name: string; assignment_id: number }[];
}

/** Mirrors `TeacherBlueprint` in its `with_assignments` view. */
export interface Teacher {
  id: number;
  school_id: number;
  name: string;
  /** Canonical 11 digits — format with `formatCpf` for display. */
  cpf: string;
  email: string;
  phone: string | null;
  classes: TeacherClass[];
}

export interface TeacherPayload {
  name: string;
  cpf: string;
  email: string;
  phone?: string | null;
}

export interface SchoolClassPayload {
  name: string;
  grade_level: string;
  year: number;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; per_page: number; total: number };
}
