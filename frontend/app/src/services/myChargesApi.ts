import { Paginated } from 'types/academics';
import { MyCharge } from 'types/myCharge';
import { request, requestBlob } from './api';

const basePath = (schoolId: number) => `/api/v1/schools/${schoolId}/me/charges`;

/** Statuses a guardian can ask for; `cancelled` is rejected by the API with a 422. */
export type MyChargeListStatus = 'pending' | 'overdue' | 'paid';

/**
 * A due-date window. The API treats `month`/`year` and `from`/`to` as mutually exclusive (both
 * together is a 422), so the two shapes are separate union members and can never be combined.
 */
export type MyChargesPeriod =
  /** `month` needs a `year`; a year alone is the whole calendar year. */
  | { kind: 'month'; year: number; month?: number }
  /** Inclusive ISO dates (`YYYY-MM-DD`); either bound may be omitted. */
  | { kind: 'range'; from?: string; to?: string };

export interface ListMyChargesParams {
  schoolId: number;
  page?: number;
  /** Narrows to one linked child. */
  studentId?: number;
  /**
   * Required on purpose: omitting `status` on the API is the legacy open-only list kept for
   * `mobile/`. Web screens always choose explicitly — `'all'` for the unified list.
   */
  status: 'all' | MyChargeListStatus[];
  period?: MyChargesPeriod;
}

const listQuery = ({
  page = 1,
  studentId,
  status,
  period,
}: Omit<ListMyChargesParams, 'schoolId'>) => {
  const query = new URLSearchParams({ page: String(page) });
  query.set('status', status === 'all' ? 'all' : status.join(','));
  if (studentId !== undefined) {
    query.set('student_id', String(studentId));
  }
  if (period?.kind === 'month') {
    query.set('year', String(period.year));
    if (period.month !== undefined) {
      query.set('month', String(period.month));
    }
  } else if (period?.kind === 'range') {
    if (period.from) {
      query.set('from', period.from);
    }
    if (period.to) {
      query.set('to', period.to);
    }
  }

  return query;
};

/**
 * GET .../me/charges — the unified "Meus boletos" list (pending, overdue and paid; never
 * `cancelled`). The API orders by `due_date`, latest first, whenever `status` is sent.
 * The legacy open-only default and `.../me/charges/history` stay on the API for `mobile/` only.
 */
export const listMyCharges = ({ schoolId, ...params }: ListMyChargesParams) =>
  request<Paginated<MyCharge>>(`${basePath(schoolId)}?${listQuery(params)}`);

/** GET .../me/charges/:id — detail with payment methods and mora rate. */
export const getMyCharge = async (schoolId: number, id: number): Promise<MyCharge> => {
  const response = await request<{ data: MyCharge }>(`${basePath(schoolId)}/${id}`);

  return response.data;
};

/** POST .../me/charges/:id/reissue — second copy boleto/Pix. */
export const reissueMyCharge = async (schoolId: number, id: number): Promise<MyCharge> => {
  const response = await request<{ data: MyCharge }>(`${basePath(schoolId)}/${id}/reissue`, {
    method: 'POST',
  });

  return response.data;
};

/**
 * GET .../me/charges/:id/boleto_pdf — the boleto PDF of a Banco Inter charge, relayed by the API.
 *
 * Fetched as a blob through the authenticated layer because the endpoint needs the bearer token,
 * which a bare `<iframe src>` or `<a href>` cannot send. Call it only when the charge's
 * `payment_methods.boleto_pdf_available` is true: each call costs one bank request and nothing is
 * cached server-side, so the caller keeps the blob for both the preview and the download.
 *
 * Failures throw `ApiError` carrying the API's `error.code` — `boleto_pdf_unavailable` (409),
 * `boleto_pdf_provider_error` (502, not retryable) or `boleto_pdf_provider_unavailable` (503).
 */
export const fetchMyChargeBoletoPdf = (schoolId: number, id: number): Promise<Blob> =>
  requestBlob(`${basePath(schoolId)}/${id}/boleto_pdf`);
