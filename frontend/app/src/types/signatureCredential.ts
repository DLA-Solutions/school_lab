/** GET /api/v1/schools/:school_id/signature_credentials — metadata only (never the token). */
export interface SchoolSignatureProvider {
  id: number;
  school_id: number;
  provider: string;
  active: boolean;
  uploaded_at: string | null;
  uploaded_by_id: number | null;
  /** Where Autentique must be told to post its callbacks. */
  webhook_path: string;
  /** Without one, every callback answers 401 and the school never learns that a family signed. */
  webhook_secret_set: boolean;
}

/**
 * The registration response, and the only one that carries the secret in the clear — it has to be
 * pasted into Autentique's own settings and cannot be read back afterwards.
 */
export interface RegisteredSignatureProvider extends SchoolSignatureProvider {
  webhook_secret: string;
}
