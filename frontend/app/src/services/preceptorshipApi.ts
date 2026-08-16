import {
  PreceptorshipListResponse,
  PreceptorshipResponse,
  RollResponse,
} from 'types/preceptorshipReport';
import { request, requestBlob } from './api';

/** Where a teacher writes. */
const teacherPath = (schoolId: number) =>
  `/api/v1/schools/${schoolId}/academics/preceptorship_reports`;

/** Where a family reads. */
const familyPath = (schoolId: number) => `/api/v1/schools/${schoolId}/me/preceptorship_reports`;

export interface ReportInput {
  student_id?: number;
  academic_period_id?: number | null;
  body: string;
}

/** GET .../academics/preceptorship_reports */
export const listReports = (schoolId: number, params: { student_id?: number } = {}) => {
  const query = params.student_id ? `?student_id=${params.student_id}` : '';

  return request<PreceptorshipListResponse>(`${teacherPath(schoolId)}${query}`);
};

/**
 * GET .../academics/preceptorship_reports/roll — the students this teacher may write about.
 *
 * Its own endpoint rather than the register's student list, which is gated on a permission
 * teachers do not hold.
 */
export const fetchRoll = (schoolId: number) =>
  request<RollResponse>(`${teacherPath(schoolId)}/roll`);

/** POST .../academics/preceptorship_reports — starts as a draft. */
export const createReport = async (schoolId: number, input: ReportInput) => {
  const response = await request<PreceptorshipResponse>(teacherPath(schoolId), {
    method: 'POST',
    body: { preceptorship_report: input },
  });

  return response.data;
};

/** PUT .../academics/preceptorship_reports/:id — refused once published. */
export const updateReport = async (schoolId: number, id: number, input: ReportInput) => {
  const response = await request<PreceptorshipResponse>(`${teacherPath(schoolId)}/${id}`, {
    method: 'PUT',
    body: { preceptorship_report: input },
  });

  return response.data;
};

/** DELETE .../academics/preceptorship_reports/:id — drafts only. */
export const deleteReport = (schoolId: number, id: number) =>
  request<null>(`${teacherPath(schoolId)}/${id}`, { method: 'DELETE' });

/** POST .../academics/preceptorship_reports/:id/publish — there is no way back. */
export const publishReport = async (schoolId: number, id: number) => {
  const response = await request<PreceptorshipResponse>(
    `${teacherPath(schoolId)}/${id}/publish`,
    { method: 'POST', body: {} },
  );

  return response.data;
};

/** GET .../me/preceptorship_reports — only what the school has published. */
export const listMyReports = (schoolId: number) =>
  request<PreceptorshipListResponse>(familyPath(schoolId));

/**
 * The PDF, from whichever side is asking. Both endpoints render the same bytes — a teacher who
 * could not see exactly what was sent home would be answering questions about a document they
 * had never read.
 */
export const fetchReportPdf = (schoolId: number, id: number, as: 'teacher' | 'family') =>
  requestBlob(`${as === 'teacher' ? teacherPath(schoolId) : familyPath(schoolId)}/${id}/pdf`);
