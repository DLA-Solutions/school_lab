/** POST /api/v1/auth/invite/accept */
export interface InviteAcceptPayload {
  token: string;
  password: string;
  name?: string;
}

export interface InviteAcceptResponse {
  data: {
    user_id: number;
    membership_id: number;
  };
}

/** POST /api/v1/me/memberships/:id/accept */
export interface MembershipAcceptResponse {
  data: MembershipSummary;
}

export interface MembershipSummary {
  id: number;
  school_id: number;
  role: string;
  status: string;
}

export type SchoolOnboardingStatus = 'provisioning' | 'pending_handoff' | 'active';
