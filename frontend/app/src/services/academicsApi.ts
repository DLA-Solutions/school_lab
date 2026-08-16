import {
  JobPosition,
  Paginated,
  SchoolClass,
  SchoolClassPayload,
  Subject,
  Teacher,
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

export const listSubjects = (schoolId: number, page = 1, q?: string) => {
  const query = new URLSearchParams({ page: String(page) });
  if (q) query.set('q', q);

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
}

export const listSchoolClasses = (
  schoolId: number,
  { page = 1, q, grade_level, shift, year }: ListSchoolClassesParams = {},
) => {
  const query = new URLSearchParams({ page: String(page) });
  // Only what was actually chosen: an empty parameter would narrow the listing to nothing.
  if (q) query.set('q', q);
  if (grade_level) query.set('grade_level', grade_level);
  if (shift) query.set('shift', shift);
  if (year) query.set('year', year);

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

/* ------------------------------------------------------------------ grades */

export interface GradeSheetPeriod {
  id: number;
  name: string;
  sequence: number;
  /** A closed period is the school's record of what was awarded; the grid greys it out. */
  closed: boolean;
}

export interface GradeSheetStudent {
  id: number;
  name: string;
  /** Keyed by period id. `null` means no mark given yet, which is not the same as a zero. */
  scores: Record<string, number | null>;
}

export interface GradeSheet {
  periods: GradeSheetPeriod[];
  students: GradeSheetStudent[];
}

/** GET .../grades — the whole sheet for one class and subject, empty cells included. */
export const fetchGradeSheet = async (
  schoolId: number,
  schoolClassId: number,
  subjectId: number,
): Promise<GradeSheet> => {
  const query = new URLSearchParams({
    school_class_id: String(schoolClassId),
    subject_id: String(subjectId),
  });
  const response = await request<{ data: GradeSheet }>(`${base(schoolId)}/grades?${query}`);

  return response.data;
};

/**
 * PUT .../grades/cell — one mark.
 *
 * A cell is identified by the student and the period rather than by a row id: the screen edits a
 * grid, and a cell nobody has marked yet has no row behind it.
 */
export const saveGradeCell = (
  schoolId: number,
  params: {
    schoolClassId: number;
    subjectId: number;
    studentId: number;
    academicPeriodId: number;
    score: number | null;
  },
) =>
  request<{ data: { student_id: number; academic_period_id: number; score: number | null } }>(
    `${base(schoolId)}/grades/cell`,
    {
      method: 'PUT',
      body: {
        school_class_id: params.schoolClassId,
        subject_id: params.subjectId,
        grade: {
          student_id: params.studentId,
          academic_period_id: params.academicPeriodId,
          score: params.score,
        },
      },
    },
  );
