import { BillingSettings, BillingSettingsPayload, BillingSettingsResponse } from 'types/billingSettings';
import { request } from './api';

const settingsPath = (schoolId: number) => `/api/v1/schools/${schoolId}/billing/settings`;

/** GET /api/v1/schools/:school_id/billing/settings */
export const fetchBillingSettings = async (schoolId: number): Promise<BillingSettings> => {
  const response = await request<BillingSettingsResponse>(settingsPath(schoolId));
  return response.data;
};

/** PATCH /api/v1/schools/:school_id/billing/settings */
export const updateBillingSettings = async (
  schoolId: number,
  payload: BillingSettingsPayload,
): Promise<BillingSettings> => {
  const response = await request<BillingSettingsResponse>(settingsPath(schoolId), {
    method: 'PATCH',
    body: { billing_settings: payload },
  });

  return response.data;
};
