import { FiscalCredential, RegisterFiscalApiKeyPayload } from 'types/fiscalCredential';
import { request } from './api';

const basePath = (schoolId: number) => `/api/v1/schools/${schoolId}/billing/fiscal_credentials`;

/** GET .../billing/fiscal_credentials */
export const listFiscalCredentials = async (schoolId: number): Promise<FiscalCredential[]> => {
  const response = await request<{ data: FiscalCredential[] }>(basePath(schoolId));

  return response.data;
};

/** POST .../billing/fiscal_credentials — register the Spedy token (and optional base URL). */
export const registerFiscalApiKey = async (
  schoolId: number,
  payload: RegisterFiscalApiKeyPayload,
): Promise<FiscalCredential> => {
  const response = await request<{ data: FiscalCredential }>(basePath(schoolId), {
    method: 'POST',
    body: payload,
  });

  return response.data;
};
