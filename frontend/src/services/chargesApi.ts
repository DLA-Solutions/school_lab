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
  status?: string;
}

export const listCharges = ({ schoolId, page = 1, status }: ListChargesParams) => {
  const query = new URLSearchParams({ page: String(page) });
  if (status) {
    query.set('status', status);
  }

  return request<Paginated<Charge>>(`${path(schoolId)}?${query}`);
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
