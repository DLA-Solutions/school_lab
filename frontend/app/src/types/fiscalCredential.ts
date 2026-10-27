/** Default Spedy API address; the API applies it when `base_url` is not sent. */
export const DEFAULT_SPEDY_BASE_URL = 'https://api.spedy.com.br/v1';

/** GET /billing/fiscal_credentials — Spedy provider metadata (no api_key). */
export interface FiscalCredential {
  id: number;
  school_id: number;
  instrument: 'service_invoice';
  provider: 'spedy';
  active: boolean;
  client_id: string;
  /** Effective Spedy API base URL (the default when none was stored). */
  base_url: string;
  certificate_fingerprint: string | null;
  certificate_expires_at: string | null;
  uploaded_at: string | null;
  uploaded_by_id: number | null;
}

/** POST /billing/fiscal_credentials — registers the Spedy token (write-only). */
export interface RegisterFiscalApiKeyPayload {
  api_key: string;
  /** Sent only when non-blank; the API falls back to the Spedy default. */
  base_url?: string;
}
