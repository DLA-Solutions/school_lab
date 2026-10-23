import { FamilyDocumentListResponse } from '../types/documents';
import { PAGE_LIMIT } from '../utils/collectPages';
import { request } from './api';

/**
 * GET /api/v1/schools/:school_id/me/documents?student_id=
 * Family documents for one linked child. A child outside the family answers 404.
 * This is not the staff `GET /documents` route and not `GET /me/students/:id/documents`.
 */
export const fetchFamilyDocuments = (
  schoolId: number,
  studentId: number,
  page: number,
  limit: number = PAGE_LIMIT,
): Promise<FamilyDocumentListResponse> => {
  const query = new URLSearchParams({
    student_id: String(studentId),
    page: String(page),
    limit: String(limit),
  });

  return request(`/schools/${schoolId}/me/documents?${query.toString()}`);
};
