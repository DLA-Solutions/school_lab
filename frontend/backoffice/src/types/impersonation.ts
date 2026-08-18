/** POST /api/v1/platform/impersonations response. */
export interface ImpersonationSession {
  id: number;
  operator_user_id: number;
  target_user_id: number;
  school_id: number;
  target_membership_id: number;
  expires_at: string;
  ended_at: string | null;
  created_at: string;
  operator_email: string;
  school_name: string;
  active: boolean;
  access_token: string;
  access_expires_at: string;
}

export interface StartImpersonationPayload {
  school_id: number;
  target_membership_id: number;
}
