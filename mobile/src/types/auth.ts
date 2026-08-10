export interface Membership {
  id: number;
  school_id: number;
  role: string;
  status: string;
  email: string | null;
  school_name: string | null;
}

export interface GuardianProfile {
  id: number;
  [key: string]: unknown;
}

export interface AuthUser {
  id: number;
  email: string;
  status: string;
  memberships: Membership[];
  guardian_profiles: GuardianProfile[];
}

/**
 * POST /api/v1/auth/login with client: 'mobile' — unlike the web client, the API has no
 * cookie jar to write to, so the refresh token travels in the response body instead.
 */
export interface LoginResponse {
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
  user: AuthUser;
}

/** POST /api/v1/auth/refresh — rotates the refresh token, returns no user. */
export interface RefreshResponse {
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at?: string;
}

/** GET /api/v1/me */
export interface MeResponse {
  data: AuthUser;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
