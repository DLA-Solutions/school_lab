import {
  BillableContract,
  BillableStudent,
  Charge,
  ChargeBatchPayload,
  ChargeBatchResult,
  OneOffChargePayload,
} from 'types/charge';
import { Paginated } from 'types/academics';
import { request, requestBlob } from './api';

const path = (schoolId: number) => `/api/v1/schools/${schoolId}/billing/charges`;
const batchPath = (schoolId: number) => `/api/v1/schools/${schoolId}/billing/charge_batches`;
const billableStudentsPath = (schoolId: number) =>
  `/api/v1/schools/${schoolId}/billing/billable_students`;

export interface ListChargesParams {
  schoolId: number;
  page?: number;
  /** One or more of `pending`, `overdue`, `paid`, `cancelled`. Omit for every status. */
  status?: string[];
  /** Matches the payer's name or CPF — the API searches both from one term. */
  q?: string;
  /** Narrows to the boletos registered against one payer. */
  guardianId?: number;
  /** ISO dates. The year view asks for one calendar year at a time. */
  dueDateFrom?: string;
  dueDateTo?: string;
}

export const listCharges = ({
  schoolId,
  page = 1,
  status,
  q,
  guardianId,
  dueDateFrom,
  dueDateTo,
}: ListChargesParams) => {
  const query = new URLSearchParams({ page: String(page) });
  if (status?.length) {
    query.set('status', status.join(','));
  }
  if (q) {
    query.set('q', q);
  }
  if (guardianId) {
    query.set('guardian_id', String(guardianId));
  }
  if (dueDateFrom) {
    query.set('due_date_from', dueDateFrom);
  }
  if (dueDateTo) {
    query.set('due_date_to', dueDateTo);
  }

  return request<Paginated<Charge>>(`${path(schoolId)}?${query}`);
};

/**
 * POST .../charges/:id/cancel — withdraws the boleto with the bank and marks it cancelled. The
 * charge stays on the listing: a family who was billed by mistake is part of the record, and a
 * row that vanished would leave the mistake unexplained.
 */
/**
 * Every boleto registered against one payer within a calendar year.
 *
 * Pagy fixes the page at 25 and takes no size from the client, so this walks the pages rather than
 * asking for a bigger one — a family with several children can carry more than 25 in a year, and a
 * year view that silently stopped at the first page would read as boletos having gone missing.
 */
export const listGuardianYearCharges = async (
  schoolId: number,
  guardianId: number,
  year: number,
): Promise<Charge[]> => {
  const collected: Charge[] = [];
  let page = 1;
  let total = 0;

  do {
    const response = await listCharges({
      schoolId,
      page,
      guardianId,
      dueDateFrom: `${year}-01-01`,
      dueDateTo: `${year}-12-31`,
    });

    collected.push(...response.data);
    total = response.meta.total;
    page += 1;
    // A page that comes back empty ends the walk even if `total` disagrees, so a miscount cannot
    // spin this forever.
  } while (collected.length < total && collected.length > 0 && page <= 20);

  return collected;
};

export const cancelCharge = async (schoolId: number, id: number): Promise<Charge> => {
  const response = await request<{ data: Charge }>(`${path(schoolId)}/${id}/cancel`, {
    method: 'POST',
  });

  return response.data;
};

/**
 * GET .../billing/charges/:id/boleto_pdf — the boleto PDF of a Banco Inter charge, relayed by the
 * API for the school's staff.
 *
 * Fetched as a blob through the authenticated layer because the endpoint needs the bearer token,
 * which a bare `<iframe src>` or `<a href>` cannot send. Call it only when the charge's
 * `payment_methods.boleto_pdf_available` is true: each call costs one bank request and nothing is
 * cached server-side, so the caller keeps the blob for both the preview and the download.
 *
 * Failures throw `ApiError` carrying the API's `error.code` — `boleto_pdf_unavailable` (409),
 * `boleto_pdf_provider_error` (502, not retryable) or `boleto_pdf_provider_unavailable` (503).
 */
export const fetchChargeBoletoPdf = (schoolId: number, id: number): Promise<Blob> =>
  requestBlob(`${path(schoolId)}/${id}/boleto_pdf`);

/**
 * POST .../billing/charges — raises a charge outside the monthly schedule. Pass a guardian to
 * bill someone directly, or a contract to bill whoever answers for it.
 */
export const createOneOffCharge = async (
  schoolId: number,
  charge: OneOffChargePayload,
): Promise<Charge> => {
  const response = await request<{ data: Charge }>(path(schoolId), {
    method: 'POST',
    body: { charge },
  });

  return response.data;
};

/**
 * GET .../billing/charge_batches — one row per enrolled student: the contract they would be
 * billed under and its amount, whether the period is already covered, or `without_contract` /
 * `tags` for a student with no billable (active and signed) contract. What the school picks from
 * before issuing a month in one pass.
 *
 * `schoolYearId` narrows the enrolled students to that year's cohort — omit it for every year.
 */
export const listBillableContracts = async (
  schoolId: number,
  billingPeriod: string,
  schoolYearId?: number | null,
): Promise<BillableContract[]> => {
  const query = new URLSearchParams({ billing_period: billingPeriod });
  if (schoolYearId) {
    query.set('school_year_id', String(schoolYearId));
  }
  const response = await request<{ data: BillableContract[] }>(
    `${batchPath(schoolId)}?${query}`,
  );

  return response.data;
};

/**
 * GET .../billing/billable_students — the avulso (one-off) flow's student-picker step: one row
 * per enrolled student, period-agnostic (no amount or due day, which only make sense once a
 * billing period is chosen). Backs picking a student first, then resolving the payer from their
 * standing contract or their own guardians.
 *
 * `schoolYearId` narrows to that year's cohort — omit it for every year.
 */
export const listBillableStudents = async (
  schoolId: number,
  schoolYearId?: number | null,
): Promise<BillableStudent[]> => {
  const query = new URLSearchParams();
  if (schoolYearId) {
    query.set('school_year_id', String(schoolYearId));
  }
  const suffix = query.toString() ? `?${query}` : '';
  const response = await request<{ data: BillableStudent[] }>(
    `${billableStudentsPath(schoolId)}${suffix}`,
  );

  return response.data;
};

/** POST .../billing/charge_batches — bills the selected contracts and sends the lot to the bank. */
export const createChargeBatch = async (
  schoolId: number,
  payload: ChargeBatchPayload,
): Promise<ChargeBatchResult> => {
  const response = await request<{ data: ChargeBatchResult }>(batchPath(schoolId), {
    method: 'POST',
    body: payload,
  });

  return response.data;
};
