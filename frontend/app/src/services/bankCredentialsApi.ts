import { SchoolPaymentProvider, UploadBankCredentialsPayload } from 'types/bankCredential';
import { request } from './api';

/** GET /api/v1/schools/:school_id/bank_credentials — list credential metadata. */
export const listBankCredentials = async (schoolId: number): Promise<SchoolPaymentProvider[]> => {
  const response = await request<{ data: SchoolPaymentProvider[] }>(
    `/api/v1/schools/${schoolId}/bank_credentials`,
  );

  return response.data;
};

/** POST /api/v1/schools/:school_id/bank_credentials — upload Cora mTLS credentials. */
export const uploadBankCredentials = async (
  schoolId: number,
  payload: UploadBankCredentialsPayload,
): Promise<SchoolPaymentProvider> => {
  const formData = new FormData();
  formData.append('provider', 'cora');
  formData.append('instrument', 'bank_slip');
  formData.append('client_id', payload.client_id);
  formData.append('certificate', payload.certificate);
  formData.append('private_key', payload.private_key);

  const response = await request<{ data: SchoolPaymentProvider }>(
    `/api/v1/schools/${schoolId}/bank_credentials`,
    { method: 'POST', body: formData },
  );

  return response.data;
};
