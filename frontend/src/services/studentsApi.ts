import { Student, StudentListResponse, StudentPayload, StudentResponse } from 'types/student';
import { request } from './api';

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
}

/** GET /api/v1/schools/:school_id/people/students — ordered by name, 25 per page. */
export const listStudents = ({ schoolId, page = 1, guardianId, q }: ListStudentsParams) => {
  const query = new URLSearchParams({ page: String(page) });
  if (guardianId !== undefined) {
    query.set('guardian_id', String(guardianId));
  }
  if (q?.trim()) {
    query.set('q', q.trim());
  }

  return request<StudentListResponse>(`${collectionPath(schoolId)}?${query}`);
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

/** DELETE /api/v1/schools/:school_id/people/students/:id — a soft delete. */
export const deleteStudent = (schoolId: number, id: number) =>
  request<null>(memberPath(schoolId, id), { method: 'DELETE' });
