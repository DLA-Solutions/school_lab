import {
  MinutesBook,
  MinutesBookListResponse,
  MinutesBookPayload,
  MinutesEntry,
  MinutesEntryListResponse,
  MinutesEntryPayload,
  MinutesKind,
  MinutesStatus,
} from 'types/minutes';
import { request, requestBlob } from './api';

/**
 * Livro Ata (BC4) — tenant routes, restricted server-side to the director / coordination /
 * secretary role templates (`docs/api/v1/documents-and-archive.md` § Livro Ata).
 */
const booksPath = (schoolId: number) => `/api/v1/schools/${schoolId}/minutes_books`;
const entriesPath = (schoolId: number) => `/api/v1/schools/${schoolId}/minutes_entries`;

export interface ListMinutesBooksParams {
  page?: number;
  year?: number;
}

/** GET .../minutes_books — newest year first, with `entries_count`. */
export const listMinutesBooks = (
  schoolId: number,
  { page = 1, year }: ListMinutesBooksParams = {},
) => {
  const query = new URLSearchParams({ page: String(page) });
  if (year !== undefined) {
    query.set('year', String(year));
  }

  return request<MinutesBookListResponse>(`${booksPath(schoolId)}?${query}`);
};

/**
 * Every book of the school — the filter and the form selects need the whole set, and a school
 * holds a handful of books a year, so walking the pages is cheap.
 */
export const listAllMinutesBooks = async (schoolId: number): Promise<MinutesBook[]> => {
  const books: MinutesBook[] = [];
  let page = 1;

  for (;;) {
    const response = await listMinutesBooks(schoolId, { page });
    books.push(...response.data);

    if (response.data.length === 0 || books.length >= response.meta.total) {
      return books;
    }
    page += 1;
  }
};

/** POST .../minutes_books — `422` on a duplicate name + year. */
export const createMinutesBook = async (
  schoolId: number,
  payload: MinutesBookPayload,
): Promise<MinutesBook> => {
  const response = await request<{ data: MinutesBook }>(booksPath(schoolId), {
    method: 'POST',
    body: { minutes_book: payload },
  });

  return response.data;
};

export interface ListMinutesEntriesParams {
  page?: number;
  /** Participant name, case/accent-insensitive substring. */
  q?: string;
  /** The book's year. */
  year?: number;
  kind?: MinutesKind;
  status?: MinutesStatus;
  minutesBookId?: number;
}

/** GET .../minutes_entries — newest first; participants carry no e-mail or CPF. */
export const listMinutesEntries = (
  schoolId: number,
  { page = 1, q, year, kind, status, minutesBookId }: ListMinutesEntriesParams = {},
) => {
  const query = new URLSearchParams({ page: String(page) });
  // Only what was chosen: an empty parameter would narrow the list to nothing.
  if (q) query.set('q', q);
  if (year !== undefined) query.set('year', String(year));
  if (kind) query.set('kind', kind);
  if (status) query.set('status', status);
  if (minutesBookId !== undefined) query.set('minutes_book_id', String(minutesBookId));

  return request<MinutesEntryListResponse>(`${entriesPath(schoolId)}?${query}`);
};

const unwrap = async (promise: Promise<{ data: MinutesEntry }>) => (await promise).data;

/** GET .../minutes_entries/:id */
export const getMinutesEntry = (schoolId: number, id: number) =>
  unwrap(request<{ data: MinutesEntry }>(`${entriesPath(schoolId)}/${id}`));

/** POST .../minutes_entries — a draft with its participants. */
export const createMinutesEntry = (schoolId: number, payload: MinutesEntryPayload) =>
  unwrap(
    request<{ data: MinutesEntry }>(entriesPath(schoolId), {
      method: 'POST',
      body: { minutes_entry: payload },
    }),
  );

/** PATCH .../minutes_entries/:id — drafts only (`409 invalid_state_transition` otherwise). */
export const updateMinutesEntry = (
  schoolId: number,
  id: number,
  payload: Omit<MinutesEntryPayload, 'kind'>,
) =>
  unwrap(
    request<{ data: MinutesEntry }>(`${entriesPath(schoolId)}/${id}`, {
      method: 'PATCH',
      body: { minutes_entry: payload },
    }),
  );

/** GET .../minutes_entries/:id/pdf — the signed copy once signed, else a fresh preview render. */
export const fetchMinutesEntryPdf = (schoolId: number, id: number) =>
  requestBlob(`${entriesPath(schoolId)}/${id}/pdf`);

/** POST .../minutes_entries/:id/send_for_signature — Autentique; `draft` only. */
export const sendMinutesEntryForSignature = (schoolId: number, id: number) =>
  unwrap(
    request<{ data: MinutesEntry }>(`${entriesPath(schoolId)}/${id}/send_for_signature`, {
      method: 'POST',
      body: {},
    }),
  );

/** POST .../minutes_entries/:id/cancel — `draft` or `pending_signature`. */
export const cancelMinutesEntry = (schoolId: number, id: number) =>
  unwrap(
    request<{ data: MinutesEntry }>(`${entriesPath(schoolId)}/${id}/cancel`, {
      method: 'POST',
      body: {},
    }),
  );
