/**
 * Livro Ata (BC4, `docs/prds/documents-and-archive/livro-ata.md`) — "Atas da Escola" in the menu.
 * Mirrors `MinutesBookBlueprint` / `MinutesEntryBlueprint` / `MinutesParticipantBlueprint` and the
 * narrative in `docs/api/v1/documents-and-archive.md` § Livro Ata.
 */
export type MinutesKind = 'meeting' | 'class_council' | 'final_results';

export type MinutesStatus = 'draft' | 'pending_signature' | 'signed' | 'cancelled';

export const MINUTES_KINDS: MinutesKind[] = ['meeting', 'class_council', 'final_results'];

export const MINUTES_STATUSES: MinutesStatus[] = [
  'draft',
  'pending_signature',
  'signed',
  'cancelled',
];

export interface MinutesBook {
  id: number;
  name: string;
  year: number;
  entries_count: number;
  created_at: string;
  updated_at: string;
}

export interface MinutesBookSummary {
  id: number;
  name: string;
  year: number;
}

/** A participant as the list view carries it — no e-mail, no CPF. */
export interface MinutesParticipantSummary {
  id: number;
  name: string;
  role_label: string | null;
  signs: boolean;
}

/** A participant in the detail view — the CPF is always masked (`***.NNN.NNN-**`). */
export interface MinutesParticipant extends MinutesParticipantSummary {
  email: string | null;
  cpf: string | null;
  signed_at: string | null;
  membership_id: number | null;
  guardian_id: number | null;
  student_id: number | null;
}

/** One row of `GET /minutes_entries`. */
export interface MinutesEntrySummary {
  id: number;
  minutes_book_id: number;
  school_class_id: number | null;
  kind: MinutesKind;
  title: string;
  held_on: string;
  status: MinutesStatus;
  signature_requested_at: string | null;
  signed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  book: MinutesBookSummary;
  participants: MinutesParticipantSummary[];
}

/** `GET /minutes_entries/:id` and the response of create / update / send_for_signature / cancel. */
export interface MinutesEntry extends Omit<MinutesEntrySummary, 'participants'> {
  body: string;
  school_id: number;
  signature_provider: string | null;
  created_by_membership_id: number | null;
  sent_to_provider: boolean;
  has_signed_pdf: boolean;
  participants: MinutesParticipant[];
}

/** One participant as it is written — the CPF is write-only and travels in full. */
export interface MinutesParticipantPayload {
  name: string;
  role_label: string;
  email: string;
  cpf: string;
  signs: boolean;
  membership_id?: number | null;
  guardian_id?: number | null;
  student_id?: number | null;
}

export interface MinutesBookPayload {
  name: string;
  year: number;
}

export interface MinutesEntryPayload {
  minutes_book_id: number;
  /** Fixed at creation — the API ignores it on `PATCH`. */
  kind?: MinutesKind;
  title: string;
  held_on: string;
  body: string;
  school_class_id: number | null;
  /** Replaces the whole list when present; leaves it alone when omitted. */
  participants?: MinutesParticipantPayload[];
}

export interface MinutesListMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface MinutesBookListResponse {
  data: MinutesBook[];
  meta: MinutesListMeta;
}

export interface MinutesEntryListResponse {
  data: MinutesEntrySummary[];
  meta: MinutesListMeta;
}
