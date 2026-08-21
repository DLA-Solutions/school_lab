import { RegisteredSignatureProvider, SchoolSignatureProvider } from 'types/signatureCredential';
import { request } from './api';

/** GET /api/v1/schools/:school_id/signature_credentials — registration metadata. */
export const listSignatureCredentials = async (
  schoolId: number,
): Promise<SchoolSignatureProvider[]> => {
  const response = await request<{ data: SchoolSignatureProvider[] }>(
    `/api/v1/schools/${schoolId}/signature_credentials`,
  );

  return response.data;
};

/**
 * POST /api/v1/schools/:school_id/signature_credentials — register the school's Autentique token.
 *
 * Re-registering replaces the token in use, which is how a rotation is done.
 */
export const registerSignatureCredentials = async (
  schoolId: number,
  apiToken: string,
): Promise<RegisteredSignatureProvider> => {
  const response = await request<{ data: RegisteredSignatureProvider }>(
    `/api/v1/schools/${schoolId}/signature_credentials`,
    { method: 'POST', body: { provider: 'autentique', api_token: apiToken } },
  );

  return response.data;
};
