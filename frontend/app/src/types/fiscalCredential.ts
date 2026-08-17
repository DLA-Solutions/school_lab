/** GET /billing/fiscal_credentials — Spedy provider metadata (no api_key). */
export interface FiscalCredential {
  id: number;
  school_id: number;
  instrument: 'service_invoice';
  provider: 'spedy';
  active: boolean;
  client_id: string;
  certificate_fingerprint: string | null;
  certificate_expires_at: string | null;
  uploaded_at: string | null;
  uploaded_by_id: number | null;
}

export interface UploadFiscalCertificatePayload {
  certificate: File;
  password: string;
}
