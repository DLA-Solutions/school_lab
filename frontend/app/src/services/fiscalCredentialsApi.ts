import { FiscalCredential, UploadFiscalCertificatePayload } from 'types/fiscalCredential';
import { request } from './api';

const basePath = (schoolId: number) => `/api/v1/schools/${schoolId}/billing/fiscal_credentials`;

/** GET .../billing/fiscal_credentials */
export const listFiscalCredentials = async (schoolId: number): Promise<FiscalCredential[]> => {
  const response = await request<{ data: FiscalCredential[] }>(basePath(schoolId));

  return response.data;
};

/** POST .../billing/fiscal_credentials — provision Spedy company for the school. */
export const provisionFiscalCredentials = async (schoolId: number): Promise<FiscalCredential> => {
  const response = await request<{ data: FiscalCredential }>(basePath(schoolId), {
    method: 'POST',
  });

  return response.data;
};

/** POST .../billing/fiscal_credentials/certificate — upload A1 certificate (.pfx). */
export const uploadFiscalCertificate = async (
  schoolId: number,
  payload: UploadFiscalCertificatePayload,
): Promise<FiscalCredential> => {
  const formData = new FormData();
  formData.append('certificate', payload.certificate);
  formData.append('password', payload.password);

  const response = await request<{ data: FiscalCredential }>(`${basePath(schoolId)}/certificate`, {
    method: 'POST',
    body: formData,
  });

  return response.data;
};
