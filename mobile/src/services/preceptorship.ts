import { PreceptorshipListResponse, PreceptorshipReport } from '../types/preceptorship';
import { PAGE_LIMIT } from '../utils/collectPages';
import { request } from './api';

/**
 * GET /api/v1/schools/:school_id/me/preceptorship_reports
 * Guardian index does not accept `student_id`. The policy scope is published reports of linked
 * students. `request()` already prefixes `/api/v1`.
 */
export const fetchPreceptorshipReports = (
  schoolId: number,
  page: number,
  limit: number = PAGE_LIMIT,
): Promise<PreceptorshipListResponse> => {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return request(`/schools/${schoolId}/me/preceptorship_reports?${query.toString()}`);
};

/**
 * GET /api/v1/schools/:school_id/me/preceptorship_reports/:id
 * A draft id and another family's id answer 404.
 */
export const fetchPreceptorshipReport = (
  schoolId: number,
  reportId: number,
): Promise<{ data: PreceptorshipReport }> =>
  request(`/schools/${schoolId}/me/preceptorship_reports/${reportId}`);
