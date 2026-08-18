/** Actor reference from AuditBlueprint — no PII in list payload. */
export type AuditActor = {
  id: number;
  type: string;
};

/** Mirrors platform audit list serializer (E2). Values in audited_changes are redacted for display. */
export type PlatformAudit = {
  id: number;
  created_at: string;
  school_id: number | null;
  actor: AuditActor | null;
  action: string;
  auditable_type: string;
  auditable_id?: number | null;
  comment?: string | null;
  changed_keys: string[];
  audited_changes?: Record<string, unknown>;
};

export type AuditListFilters = {
  school_id?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
};
