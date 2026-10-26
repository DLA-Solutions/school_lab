import { BillingPurpose } from 'types/billingPurpose';
import { request } from './api';

const path = (schoolId: number) => `/api/v1/schools/${schoolId}/billing/purposes`;

/**
 * GET .../billing/purposes — what a charge can be for. The API provisions the school's defaults
 * on first read, so the list is never empty for a school that has not set any up yet.
 */
export const listBillingPurposes = async (schoolId: number): Promise<BillingPurpose[]> => {
  const response = await request<{ data: BillingPurpose[] }>(path(schoolId));

  return response.data;
};
