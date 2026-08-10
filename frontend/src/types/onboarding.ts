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

export type SchoolOnboardingMode = 'self_serve' | 'white_glove';

/** Checklist keys returned in `422 details.checklist` from POST handoff. */
export type HandoffChecklistItem = 'billing' | 'owner_active' | 'owner_invite' | 'invalid_phase';

export interface HandoffSchool {
  id: number;
  onboarding_status: SchoolOnboardingStatus;
  onboarding_mode: string;
  billing_waived_at: string | null;
  segments_skipped_at: string | null;
}

export interface HandoffPayload {
  handoff?: {
    billing_waived?: boolean;
  };
}

export interface HandoffResponse {
  data: HandoffSchool;
}

export interface RoleTemplateSummary {
  id: number;
  name: string;
  system_key: string | null;
  is_system: boolean;
}

export interface CreateStaffInvitePayload {
  membership: {
    email: string;
    role: 'staff';
    role_template_id: number;
    display_title?: string;
  };
}

export interface CreatedMembership {
  id: number;
  status: string;
  role: string;
  display_title: string | null;
}
