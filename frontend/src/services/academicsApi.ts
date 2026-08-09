import {
  Paginated,
  SchoolClass,
  SchoolClassPayload,
  Subject,
  Teacher,
  TeacherPayload,
} from 'types/academics';
import { request } from './api';

const base = (schoolId: number) => `/api/v1/schools/${schoolId}/academics`;

/* ---------------------------------------------------------------- subjects */

export const listSubjects = (schoolId: number, page = 1) =>
  request<Paginated<Subject>>(`${base(schoolId)}/subjects?page=${page}`);

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

export const listSchoolClasses = (schoolId: number, page = 1) =>
  request<Paginated<SchoolClass>>(`${base(schoolId)}/school_classes?page=${page}`);

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

export const deleteSchoolClass = (schoolId: number, id: number) =>
  request<null>(`${base(schoolId)}/school_classes/${id}`, { method: 'DELETE' });

/* ---------------------------------------------------------------- teachers */

export interface ListTeachersParams {
  schoolId: number;
  page?: number;
  /** Reads the same listing from a cohort's side: "who teaches in this class?". */
  schoolClassId?: number;
}

export const listTeachers = ({ schoolId, page = 1, schoolClassId }: ListTeachersParams) => {
  const query = new URLSearchParams({ page: String(page) });
  if (schoolClassId !== undefined) {
    query.set('school_class_id', String(schoolClassId));
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
