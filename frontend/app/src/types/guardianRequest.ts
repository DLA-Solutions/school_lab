/** What a guardian asked the school for — mirrors `GuardianRequest::KINDS`. */
export type GuardianRequestKind = 'declaration' | 'second_call';

/** Where the ask has got to — mirrors `GuardianRequestStateMachine`. */
export type GuardianRequestStatus = 'pending' | 'in_progress' | 'fulfilled' | 'rejected';

export interface GuardianRequest {
  id: number;
  school_id: number;
  kind: GuardianRequestKind;
  status: GuardianRequestStatus;
  details: string;
  reference_date: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  guardian_id: number;
  student_id: number;
  subject_id: number | null;
  guardian_name: string | null;
  student_name: string | null;
  subject_name: string | null;
  /** Staff view only — who at the school answered it. */
  resolved_by_name?: string | null;
}

export interface GuardianRequestListResponse {
  data: GuardianRequest[];
  meta: { page: number; per_page: number; total: number };
}

export interface GuardianRequestResponse {
  data: GuardianRequest;
}

/** What the form sends when a request is opened. */
export interface GuardianRequestInput {
  student_id: number;
  kind: GuardianRequestKind;
  details: string;
  subject_id?: number | null;
  reference_date?: string | null;
  /** Staff only: whose request it is. The guardian's own form has no say in this. */
  guardian_id?: number;
}
