/** GET /api/v1/schools/:school_id/bank_credentials — metadata only (no PEM bodies). */
export interface SchoolPaymentProvider {
  id: number;
  school_id: number;
  instrument: string;
  provider: string;
  active: boolean;
  client_id: string;
  certificate_fingerprint: string;
  certificate_expires_at: string;
  uploaded_at: string;
  uploaded_by_id: number;
}

export interface UploadBankCredentialsPayload {
  client_id: string;
  certificate: File;
  private_key: File;
}
