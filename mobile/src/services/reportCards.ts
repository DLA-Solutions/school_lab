import { API_BASE_URL, refreshAccessToken, request } from './api';
import { getAccessToken } from './tokenStore';
import {
  GuardianStudent,
  ReportCardListResponse,
  ReportCardPublication,
  ReportCardSnapshot,
} from '../types/reportCards';

interface ReportCardListParams {
  studentId?: number;
  academicPeriodId?: number;
}

/**
 * GET /api/v1/schools/:school_id/me/report_cards
 * Guardian's released report card snapshots, optionally filtered by child and/or period.
 */
export const fetchReportCards = async (
  schoolId: number,
  { studentId, academicPeriodId }: ReportCardListParams = {},
): Promise<ReportCardListResponse> => {
  const query = new URLSearchParams();
  if (studentId) {
    query.set('student_id', String(studentId));
  }
  if (academicPeriodId) {
    query.set('academic_period_id', String(academicPeriodId));
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return request(`/schools/${schoolId}/me/report_cards${suffix}`);
};

/**
 * GET /api/v1/schools/:school_id/me/report_cards/:publication_id
 * Aggregate + active released snapshot for one publication.
 */
export const fetchReportCardPublication = (
  schoolId: number,
  publicationId: number,
): Promise<{ data: ReportCardPublication }> =>
  request(`/schools/${schoolId}/me/report_cards/${publicationId}`);

/**
 * GET /api/v1/schools/:school_id/me/report_cards/:publication_id/snapshots/:snapshot_id
 * One exact released snapshot — used when a publication has a correction history and an older
 * version needs to be re-read (not just the currently active one).
 */
export const fetchReportCardSnapshot = (
  schoolId: number,
  publicationId: number,
  snapshotId: number,
): Promise<{ data: ReportCardSnapshot }> =>
  request(`/schools/${schoolId}/me/report_cards/${publicationId}/snapshots/${snapshotId}`);

/**
 * GET /api/v1/schools/:school_id/me/students (view: guardian)
 * Just {id, name} for the guardian's linked children — the report card list/show payloads only
 * carry `student_id`, so this is what resolves it to a name for the child filter/grouping.
 */
export const fetchGuardianStudents = (schoolId: number): Promise<{ data: GuardianStudent[] }> =>
  request(`/schools/${schoolId}/me/students`);

/**
 * GET /api/v1/schools/:school_id/me/report_cards/:publication_id/snapshots/:snapshot_id/pdf
 *
 * Unlike a boleto's `payment_methods.boleto_url` (a pre-signed third-party link that
 * `WebBrowser.openBrowserAsync` can open directly), this is one of our own API routes and is
 * gated by `authenticate_user!` — it requires the bearer access token, which a plain browser
 * navigation cannot send. So this downloads the PDF bytes in-app (retrying once on 401, same as
 * `request()`) and resolves a base64 data URI the caller can hand to `WebBrowser.openBrowserAsync`
 * or `Linking.openURL`.
 */
export const fetchReportCardPdfDataUri = async (
  schoolId: number,
  publicationId: number,
  snapshotId: number,
): Promise<string> => {
  const path = `/schools/${schoolId}/me/report_cards/${publicationId}/snapshots/${snapshotId}/pdf`;

  const doFetch = () =>
    fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
    });

  let response = await doFetch();

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await doFetch();
    }
  }

  if (!response.ok) {
    let message = 'Não foi possível baixar o boletim.';
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body?.error?.message) {
        message = body.error.message;
      }
    } catch {
      // No JSON error body (e.g. a bare 404) — keep the generic message.
    }
    throw new Error(message);
  }

  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível processar o boletim.'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};
