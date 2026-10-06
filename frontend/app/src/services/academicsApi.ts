import {
  JobPosition,
  Paginated,
  SchoolClass,
  SchoolClassPayload,
  Subject,
  Teacher,
  TeacherBankAccount,
  TeacherBankAccountPayload,
  TeacherHealthProfile,
  TeacherHealthProfilePayload,
  TeacherPayload,
  TeachingAssignment,
} from 'types/academics';
import { request } from './api';

const base = (schoolId: number) => `/api/v1/schools/${schoolId}/academics`;

/* ----------------------------------------------------------- job positions */

export const listJobPositions = (schoolId: number, page = 1) =>
  request<Paginated<JobPosition>>(`${base(schoolId)}/job_positions?page=${page}`);

export const createJobPosition = async (schoolId: number, name: string): Promise<JobPosition> => {
  const response = await request<{ data: JobPosition }>(`${base(schoolId)}/job_positions`, {
    method: 'POST',
    body: { job_position: { name } },
  });

  return response.data;
};

export const updateJobPosition = async (
  schoolId: number,
  id: number,
  name: string,
): Promise<JobPosition> => {
  const response = await request<{ data: JobPosition }>(`${base(schoolId)}/job_positions/${id}`, {
    method: 'PATCH',
    body: { job_position: { name } },
  });

  return response.data;
};

export const deleteJobPosition = (schoolId: number, id: number) =>
  request<null>(`${base(schoolId)}/job_positions/${id}`, { method: 'DELETE' });

/**
 * Creates whatever of the standard set the school is missing. A school opened before this
 * register existed would otherwise start with no posts — and no way to add a collaborator.
 */
export const provisionDefaultJobPositions = async (schoolId: number): Promise<JobPosition[]> => {
  const response = await request<{ data: JobPosition[] }>(
    `${base(schoolId)}/job_positions/provision_defaults`,
    { method: 'POST' },
  );

  return response.data;
};

/* ---------------------------------------------------------------- subjects */

export const listSubjects = (schoolId: number, page = 1, q?: string, mine?: boolean) => {
  const query = new URLSearchParams({ page: String(page) });
  if (q) query.set('q', q);
  // Narrows the listing to only the subjects the current teacher is assigned to. No-op for staff.
  if (mine) query.set('mine', 'true');

  return request<Paginated<Subject>>(`${base(schoolId)}/subjects?${query}`);
};

export const createSubject = async (schoolId: number, name: string): Promise<Subject> => {
  const response = await request<{ data: Subject }>(`${base(schoolId)}/subjects`, {
    method: 'POST',
    body: { subject: { name } },
  });

  return response.data;
};

export const updateSubject = async (
  schoolId: number,
  id: number,
  name: string,
): Promise<Subject> => {
  const response = await request<{ data: Subject }>(`${base(schoolId)}/subjects/${id}`, {
    method: 'PATCH',
    body: { subject: { name } },
  });

  return response.data;
};

export const deleteSubject = (schoolId: number, id: number) =>
  request<null>(`${base(schoolId)}/subjects/${id}`, { method: 'DELETE' });

/* ----------------------------------------------------------- school classes */

export interface ListSchoolClassesParams {
  page?: number;
  /** Matches the cohort's own letter, in whatever case it was typed. */
  q?: string;
  grade_level?: string;
  shift?: string;
  year?: string;
  /** Grade book: classes the teacher holds a class discipline for. No-op for staff. */
  mine?: boolean;
  /**
   * Family chat: classes the teacher holds a kept teaching assignment for.
   * Distinct from `mine`. No-op for staff.
   */
  assignment?: 'teaching';
}

export const listSchoolClasses = (
  schoolId: number,
  { page = 1, q, grade_level, shift, year, mine, assignment }: ListSchoolClassesParams = {},
) => {
  const query = new URLSearchParams({ page: String(page) });
  // Only what was actually chosen: an empty parameter would narrow the listing to nothing.
  if (q) query.set('q', q);
  if (grade_level) query.set('grade_level', grade_level);
  if (shift) query.set('shift', shift);
  if (year) query.set('year', year);
  if (mine) query.set('mine', 'true');
  if (assignment) query.set('assignment', assignment);

  return request<Paginated<SchoolClass>>(`${base(schoolId)}/school_classes?${query}`);
};

/**
 * DELETE .../school_classes/:id — a discard, so teaching assignments and any contract that named
 * the cohort keep pointing at a row that still exists. The API refuses while students are still
 * enrolled in it.
 */
export const deleteSchoolClass = (schoolId: number, id: number) =>
  request<null>(`${base(schoolId)}/school_classes/${id}`, { method: 'DELETE' });

export const createSchoolClass = async (
  schoolId: number,
  school_class: SchoolClassPayload,
): Promise<SchoolClass> => {
  const response = await request<{ data: SchoolClass }>(`${base(schoolId)}/school_classes`, {
    method: 'POST',
    body: { school_class },
  });

  return response.data;
};

export const updateSchoolClass = async (
  schoolId: number,
  id: number,
  school_class: SchoolClassPayload,
): Promise<SchoolClass> => {
  const response = await request<{ data: SchoolClass }>(
    `${base(schoolId)}/school_classes/${id}`,
    { method: 'PATCH', body: { school_class } },
  );

  return response.data;
};

/* ---------------------------------------------------------------- teachers */

export interface ListTeachersParams {
  schoolId: number;
  page?: number;
  /** Reads the same listing from a cohort's side: "who teaches in this class?". */
  schoolClassId?: number;
  /** One term matched against both the name and the CPF. */
  q?: string;
}

export const listTeachers = ({ schoolId, page = 1, schoolClassId, q }: ListTeachersParams) => {
  const query = new URLSearchParams({ page: String(page) });
  if (schoolClassId !== undefined) {
    query.set('school_class_id', String(schoolClassId));
  }
  if (q?.trim()) {
    query.set('q', q.trim());
  }

  return request<Paginated<Teacher>>(`${base(schoolId)}/teachers?${query}`);
};

export const createTeacher = async (
  schoolId: number,
  teacher: TeacherPayload,
): Promise<Teacher> => {
  const response = await request<{ data: Teacher }>(`${base(schoolId)}/teachers`, {
    method: 'POST',
    body: { teacher },
  });

  return response.data;
};

export const updateTeacher = async (
  schoolId: number,
  id: number,
  teacher: TeacherPayload,
): Promise<Teacher> => {
  const response = await request<{ data: Teacher }>(`${base(schoolId)}/teachers/${id}`, {
    method: 'PATCH',
    body: { teacher },
  });

  return response.data;
};

export const deleteTeacher = (schoolId: number, id: number) =>
  request<null>(`${base(schoolId)}/teachers/${id}`, { method: 'DELETE' });

/**
 * Attaches a teacher to one subject of one class, and returns the teacher with every assignment
 * regrouped — so the caller refreshes a row without a second request.
 */
export const assignTeaching = async (
  schoolId: number,
  teacherId: number,
  { schoolClassId, subjectId }: { schoolClassId: number; subjectId: number },
): Promise<Teacher> => {
  const response = await request<{ data: Teacher }>(
    `${base(schoolId)}/teachers/${teacherId}/teaching_assignments`,
    {
      method: 'POST',
      body: { teaching_assignment: { school_class_id: schoolClassId, subject_id: subjectId } },
    },
  );

  return response.data;
};

export const removeTeachingAssignment = (schoolId: number, assignmentId: number) =>
  request<null>(`${base(schoolId)}/teaching_assignments/${assignmentId}`, { method: 'DELETE' });

export interface ListTeachingAssignmentsParams {
  page?: number;
  /** One term, matched by the API against the teacher, the subject or the cohort's letter. */
  q?: string;
  school_class_id?: string;
  subject_id?: string;
  year?: string;
}

/** GET .../teaching_assignments — every lesson in the school, one row each. */
export const listTeachingAssignments = (
  schoolId: number,
  { page = 1, q, school_class_id, subject_id, year }: ListTeachingAssignmentsParams = {},
) => {
  const query = new URLSearchParams({ page: String(page) });
  if (q) query.set('q', q);
  if (school_class_id) query.set('school_class_id', school_class_id);
  if (subject_id) query.set('subject_id', subject_id);
  if (year) query.set('year', year);

  return request<Paginated<TeachingAssignment>>(
    `${base(schoolId)}/teaching_assignments?${query}`,
  );
};

/* -------------------------------------------------------------- grade book */

/** One of the up to three named marks a period carries — mirrors `EvaluationComponentBlueprint`. */
export interface GradeBookComponent {
  id: number;
  /** Server-named: "P1", "P2", "Trabalho" today — render whatever comes back, don't hardcode. */
  name: string;
  position: number;
  weight_percent: number;
}

/** One term of the school year — mirrors `AcademicPeriodBlueprint`. */
export interface GradeBookPeriod {
  id: number;
  name: string;
  sequence: number;
  /** A closed period is the school's record of what was awarded; the grid greys it out. */
  closed: boolean;
  components: GradeBookComponent[];
}

export interface GradeBookStudent {
  id: number;
  name: string;
  /**
   * Keyed by period id, then by component id. `null` (or the key simply missing) means no mark
   * given yet, which is not the same as a zero.
   */
  entries: Record<string, Record<string, number | null>>;
}

/** What the book is marking, so the screen can name it rather than showing a bare grid. */
export interface GradeBookContext {
  school_class_id: number;
  school_class_label: string;
  subject_id: number;
  subject_name: string;
  class_discipline_id: number;
  year: number;
}

export interface GradeBook {
  context: GradeBookContext;
  periods: GradeBookPeriod[];
  students: GradeBookStudent[];
}

/** GET .../grade_book — the whole book for one class and subject, empty cells included. */
export const fetchGradeBook = async (
  schoolId: number,
  schoolClassId: number,
  subjectId: number,
): Promise<GradeBook> => {
  const query = new URLSearchParams({ subject_id: String(subjectId) });
  const response = await request<{ data: GradeBook }>(
    `${base(schoolId)}/classes/${schoolClassId}/grade_book?${query}`,
  );

  return response.data;
};

/**
 * PUT .../grade_book/entries — one mark.
 *
 * A cell is identified by the student, the period and the component rather than by a row id: the
 * screen edits a grid, and a cell nobody has marked yet has no row behind it.
 */
export const saveGradeBookEntry = (
  schoolId: number,
  schoolClassId: number,
  params: {
    studentId: number;
    academicPeriodId: number;
    evaluationComponentId: number;
    value: number | null;
  },
) =>
  request<{
    data: {
      student_id: number;
      academic_period_id: number;
      evaluation_component_id: number;
      value: string | number | null;
    };
  }>(`${base(schoolId)}/classes/${schoolClassId}/grade_book/entries`, {
    method: 'PUT',
    body: {
      grade_entry: {
        student_id: params.studentId,
        academic_period_id: params.academicPeriodId,
        evaluation_component_id: params.evaluationComponentId,
        value: params.value === null ? null : String(params.value),
      },
    },
  });

/**
 * GET .../teachers/:id/bank_account — where this collaborator's salary is sent.
 *
 * One standing record per person, so it is a singular resource: there is nothing to list, only
 * the account that is current. A collaborator nobody has set up yet answers an empty sheet
 * rather than a 404 — not being paid yet is a state, not a failure.
 */
export const getTeacherBankAccount = async (schoolId: number, teacherId: number) => {
  const response = await request<{ data: TeacherBankAccount }>(
    `${base(schoolId)}/teachers/${teacherId}/bank_account`,
  );

  return response.data;
};

/** PUT .../teachers/:id/bank_account — replaces the details rather than adding a second set. */
export const updateTeacherBankAccount = async (
  schoolId: number,
  teacherId: number,
  payload: TeacherBankAccountPayload,
) => {
  const response = await request<{ data: TeacherBankAccount }>(
    `${base(schoolId)}/teachers/${teacherId}/bank_account`,
    { method: 'PUT', body: { bank_account: payload } },
  );

  return response.data;
};

/* ------------------------------------------------ collaborator health profile (BC6) */

/**
 * GET .../teachers/:id/health_profile — staff read of a collaborator's health profile.
 *
 * `manage_people` only, same gate as the Colaboradores roster itself; read-only — there is no
 * PUT on this nesting at all, even for staff (only the teacher themself may write, via the
 * `me/teacher_health_profile` self-service endpoint below).
 */
export const getTeacherHealthProfile = async (schoolId: number, teacherId: number) => {
  const response = await request<{ data: TeacherHealthProfile }>(
    `${base(schoolId)}/teachers/${teacherId}/health_profile`,
  );

  return response.data;
};

/**
 * GET .../me/teacher_health_profile — the logged-in teacher's own health profile, resolved
 * server-side by matching login email against a `Teacher` row — never by a `teacher_id` param.
 */
export const getMyTeacherHealthProfile = async (schoolId: number) => {
  const response = await request<{ data: TeacherHealthProfile }>(
    `${base(schoolId)}/me/teacher_health_profile`,
  );

  return response.data;
};

/** PUT .../me/teacher_health_profile — the logged-in teacher upserts their own profile. */
export const updateMyTeacherHealthProfile = async (
  schoolId: number,
  payload: TeacherHealthProfilePayload,
) => {
  const response = await request<{ data: TeacherHealthProfile }>(
    `${base(schoolId)}/me/teacher_health_profile`,
    { method: 'PUT', body: { health_profile: payload } },
  );

  return response.data;
};
