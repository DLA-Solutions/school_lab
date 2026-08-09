import { Paginated } from 'types/academics';
import { SchoolTransaction, SchoolTransactionPayload, TransactionKind } from 'types/transaction';
import { request } from './api';

const path = (schoolId: number) => `/api/v1/schools/${schoolId}/billing/transactions`;

export interface ListTransactionsParams {
  schoolId: number;
  page?: number;
  kind?: TransactionKind;
  /** Inclusive `YYYY-MM-DD` bounds on the date the movement happened. */
  from?: string;
  to?: string;
}

export const listTransactions = ({ schoolId, page = 1, kind, from, to }: ListTransactionsParams) => {
  const query = new URLSearchParams({ page: String(page) });
  if (kind) {
    query.set('kind', kind);
  }
  if (from) {
    query.set('from', from);
  }
  if (to) {
    query.set('to', to);
  }

  return request<Paginated<SchoolTransaction>>(`${path(schoolId)}?${query}`);
};

export const createTransaction = async (
  schoolId: number,
  schoolTransaction: SchoolTransactionPayload,
): Promise<SchoolTransaction> => {
  const response = await request<{ data: SchoolTransaction }>(path(schoolId), {
    method: 'POST',
    body: { school_transaction: schoolTransaction },
  });

  return response.data;
};

export const deleteTransaction = (schoolId: number, id: number) =>
  request<null>(`${path(schoolId)}/${id}`, { method: 'DELETE' });
