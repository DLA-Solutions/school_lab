import { Student, StudentListResponse, StudentPayload, StudentResponse } from 'types/student';
import { request, requestBlob } from './api';

const collectionPath = (schoolId: number) => `/api/v1/schools/${schoolId}/people/students`;

const memberPath = (schoolId: number, id: number) => `${collectionPath(schoolId)}/${id}`;

export interface ListStudentsParams {
  schoolId: number;
  /** One-based, as Pagy counts pages. */
  page?: number;
  /** Narrows to the children linked to one guardian. */
  guardianId?: number;
  /** One term matched against both the name and the CPF. */
  q?: string;
  /** `active` (the default), `inactive` or `all`. */
  status?: 'active' | 'inactive' | 'all';
}

/** GET /api/v1/schools/:school_id/people/students — ordered by name, 25 per page. */
export const listStudents = ({ schoolId, page = 1, guardianId, q, status }: ListStudentsParams) => {
  const query = new URLSearchParams({ page: String(page) });
  if (guardianId !== undefined) {
    query.set('guardian_id', String(guardianId));
  }
  if (q?.trim()) {
    query.set('q', q.trim());
  }
  if (status && status !== 'active') {
    query.set('status', status);
  }

  return request<StudentListResponse>(`${collectionPath(schoolId)}?${query}`);
};

/**
 * GET /api/v1/schools/:school_id/me/students — the children in this guardian's care.
 *
 * A narrower payload than the register's: the blueprint's `guardian` view carries the name and
 * nothing else, which is all a guardian needs to say which child a form is about.
 *
 * `page` is one-based, as Pagy counts pages. Callers that omit it still ask for the first page.
 */
export const listMyStudents = (schoolId: number, page = 1) => {
  const query = new URLSearchParams({ page: String(page) });

  return request<StudentListResponse>(`/api/v1/schools/${schoolId}/me/students?${query}`);
};

/** POST /api/v1/schools/:school_id/people/students */
export const createStudent = async (
  schoolId: number,
  student: StudentPayload,
): Promise<Student> => {
  const response = await request<StudentResponse>(collectionPath(schoolId), {
    method: 'POST',
    body: { student },
  });

  return response.data;
};

/** PATCH /api/v1/schools/:school_id/people/students/:id */
export const updateStudent = async (
  schoolId: number,
  id: number,
  student: StudentPayload,
): Promise<Student> => {
  const response = await request<StudentResponse>(memberPath(schoolId, id), {
    method: 'PATCH',
    body: { student },
  });

  return response.data;
};

/** POST .../students/:id/activate — puts a student back on the roll. */
export const activateStudent = async (schoolId: number, id: number): Promise<Student> => {
  const response = await request<StudentResponse>(`${memberPath(schoolId, id)}/activate`, {
    method: 'POST',
  });

  return response.data;
};

/** DELETE /api/v1/schools/:school_id/people/students/:id — a soft delete. */
export const deleteStudent = (schoolId: number, id: number) =>
  request<null>(memberPath(schoolId, id), { method: 'DELETE' });

export interface StudentsReportParams {
  columns: string[];
  q?: string;
  status?: string;
}

/**
 * GET .../students/report — the roll as a PDF, grouped by cohort, one class per page.
 *
 * Fetched rather than linked: the endpoint needs the bearer token, which an `<a href>` cannot
 * carry.
 */
export const fetchStudentsReport = async (
  schoolId: number,
  { columns, q, status }: StudentsReportParams,
): Promise<Blob> => {
  const query = new URLSearchParams({ columns: columns.join(',') });
  if (q) query.set('q', q);
  if (status && status !== 'active') query.set('status', status);

  return requestBlob(`/api/v1/schools/${schoolId}/people/students/report?${query}`);
};
