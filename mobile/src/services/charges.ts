import { request } from './api';
import { Charge, ChargeHistoryItem, ChargeListResponse } from '../types/charges';

/**
 * Fetch open/pending charges for a guardian.
 * GET /api/v1/schools/:school_id/me/charges
 */
export const fetchOpenCharges = async (schoolId: number): Promise<ChargeListResponse<Charge>> => {
  return request(`/schools/${schoolId}/me/charges`);
};

/**
 * Fetch paid charge history for a guardian.
 * GET /api/v1/schools/:school_id/me/charges/history
 */
export const fetchChargeHistory = async (schoolId: number): Promise<ChargeListResponse<ChargeHistoryItem>> => {
  return request(`/schools/${schoolId}/me/charges/history`);
};
