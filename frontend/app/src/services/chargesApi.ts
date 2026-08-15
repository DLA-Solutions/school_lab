import {
  BillableContract,
  Charge,
  ChargeBatchPayload,
  ChargeBatchResult,
  OneOffChargePayload,
} from 'types/charge';
import { Paginated } from 'types/academics';
import { request } from './api';

const path = (schoolId: number) => `/api/v1/schools/${schoolId}/billing/charges`;
const batchPath = (schoolId: number) => `/api/v1/schools/${schoolId}/billing/charge_batches`;

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
 * GET .../billing/charge_batches — every active contract with the amount it bills, and whether
 * the period is already covered. What the school picks from before issuing a month in one pass.
 */
export const listBillableContracts = async (
  schoolId: number,
  billingPeriod: string,
): Promise<BillableContract[]> => {
  const query = new URLSearchParams({ billing_period: billingPeriod });
  const response = await request<{ data: BillableContract[] }>(
    `${batchPath(schoolId)}?${query}`,
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
