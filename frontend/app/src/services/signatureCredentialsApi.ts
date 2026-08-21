import { RegisteredSignatureProvider, SchoolSignatureProvider } from 'types/signatureCredential';
import { request } from './api';

const base = (schoolId: number) => `/api/v1/schools/${schoolId}/signature_credentials`;

/** GET .../signature_credentials — registration metadata; never the token. */
export const listSignatureCredentials = async (
  schoolId: number,
): Promise<SchoolSignatureProvider[]> => {
  const response = await request<{ data: SchoolSignatureProvider[] }>(base(schoolId));

  return response.data;
};

/**
 * POST .../signature_credentials — register the school's Autentique token.
 *
 * Re-registering replaces the token in use, which is how a rotation is done.
 */
export const registerSignatureCredentials = async (
  schoolId: number,
  apiToken: string,
): Promise<RegisteredSignatureProvider> => {
  const response = await request<{ data: RegisteredSignatureProvider }>(base(schoolId), {
    method: 'POST',
    body: { provider: 'autentique', api_token: apiToken },
  });

  return response.data;
};
