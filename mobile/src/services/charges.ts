import { request } from './api';
import { Charge, ChargeHistoryItem, ChargeListResponse } from '../types/charges';

/**
 * Fetch open (pending/overdue) charges for a guardian.
 * GET /api/v1/schools/:school_id/me/charges
 *
 * The endpoint returns the guardian's whole charge list by default — pending, overdue, and
 * paid (never cancelled) — because the same route also backs a unified "all my boletos" view
 * elsewhere. It supports a `status` filter, but only one value at a time, so a single request
 * cannot ask for "pending or overdue" server-side. Filter client-side instead so this
 * function's name stays true to what it returns; `fetchChargeHistory` remains the source for
 * paid charges.
 */
export const fetchOpenCharges = async (schoolId: number): Promise<ChargeListResponse<Charge>> => {
  const response = await request<ChargeListResponse<Charge>>(`/schools/${schoolId}/me/charges`);

  return {
    ...response,
    data: response.data.filter((charge) => charge.status === 'pending' || charge.status === 'overdue'),
  };
};

/**
 * Fetch paid charge history for a guardian.
 * GET /api/v1/schools/:school_id/me/charges/history
 */
export const fetchChargeHistory = async (schoolId: number): Promise<ChargeListResponse<ChargeHistoryItem>> => {
  return request(`/schools/${schoolId}/me/charges/history`);
};
