export type MembershipRole = string;

export interface RoleTemplate {
  id: number;
  name: string;
  system_key: string | null;
  is_system: boolean;
}

export interface Membership {
  id: number;
  school_id: number;
  role: MembershipRole;
  status: string;
  email: string | null;
  school_name: string | null;
  role_template: RoleTemplate | null;
  permissions: string[];
  is_owner: boolean | null;
  segment_id: number | null;
  display_title: string | null;
  permission_sources: Record<string, string>;
  /** Present when GET /me embeds school lifecycle (onboarding guards). */
  school_onboarding_status?: string;
  school_onboarding_mode?: string;
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

/** POST /api/v1/auth/login — `client: 'web'` keeps the refresh token in an httpOnly cookie. */
export interface LoginResponse {
  access_token: string;
  access_expires_at: string;
  refresh_expires_at?: string;
  user: AuthUser;
}

/** POST /api/v1/auth/refresh — rotates the cookie and returns a new access token only. */
export interface RefreshResponse {
  access_token: string;
  access_expires_at: string;
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
