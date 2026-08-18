import { FiscalSettings, FiscalSettingsPayload } from 'types/fiscalSettings';
import { request } from './api';

const basePath = (schoolId: number) => `/api/v1/schools/${schoolId}/billing/fiscal_settings`;

/** GET .../billing/fiscal_settings */
export const fetchFiscalSettings = async (schoolId: number): Promise<FiscalSettings> => {
  const response = await request<{ data: FiscalSettings }>(basePath(schoolId));

  return response.data;
};

/** PATCH .../billing/fiscal_settings */
export const updateFiscalSettings = async (
  schoolId: number,
  payload: FiscalSettingsPayload,
): Promise<FiscalSettings> => {
  const response = await request<{ data: FiscalSettings }>(basePath(schoolId), {
    method: 'PATCH',
    body: { fiscal_settings: payload },
  });

  return response.data;
};
