import { request } from './api';
import { Charge, ChargeDetailResponse, ChargeHistoryItem, ChargeListResponse } from '../types/charges';

/** Optional `student_id` matches the guardian charges list filter. */
const chargesPath = (schoolId: number, suffix: string, studentId?: number) => {
  const path = `/schools/${schoolId}/me/charges${suffix}`;
  if (studentId === undefined) {
    return path;
  }

  const query = new URLSearchParams();
  query.set('student_id', String(studentId));
  return `${path}?${query.toString()}`;
};

/**
 * Fetch open/pending charges for a guardian.
 * GET /api/v1/schools/:school_id/me/charges
 */
export const fetchOpenCharges = (
  schoolId: number,
  studentId?: number,
): Promise<ChargeListResponse<Charge>> => request(chargesPath(schoolId, '', studentId));

/**
 * Fetch one charge for the guardian.
 * GET /api/v1/schools/:school_id/me/charges/:id
 */
export const fetchCharge = (schoolId: number, chargeId: number): Promise<ChargeDetailResponse> =>
  request(`/schools/${schoolId}/me/charges/${chargeId}`);

/**
 * Fetch paid charge history for a guardian.
 * GET /api/v1/schools/:school_id/me/charges/history
 */
export const fetchChargeHistory = (
  schoolId: number,
  studentId?: number,
): Promise<ChargeListResponse<ChargeHistoryItem>> => request(chargesPath(schoolId, '/history', studentId));
