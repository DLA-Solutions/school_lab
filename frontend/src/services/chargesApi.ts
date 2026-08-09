import { Charge, OneOffChargePayload } from 'types/charge';
import { Paginated } from 'types/academics';
import { request } from './api';

const path = (schoolId: number) => `/api/v1/schools/${schoolId}/billing/charges`;

export interface ListChargesParams {
  schoolId: number;
  page?: number;
  status?: string;
}

export const listCharges = ({ schoolId, page = 1, status }: ListChargesParams) => {
  const query = new URLSearchParams({ page: String(page) });
  if (status) {
    query.set('status', status);
  }

  return request<Paginated<Charge>>(`${path(schoolId)}?${query}`);
};

/**
 * POST .../billing/charges — raises a charge outside the monthly schedule. The API attaches it
 * to the contract's payer, so the boleto carries the CPF that answers for that contract.
 */
export const createOneOffCharge = async (
  schoolId: number,
  charge: OneOffChargePayload,
): Promise<Charge> => {
  const response = await request<{ data: Charge }>(path(schoolId), {
    method: 'POST',
    body: { charge },
  });

  return response.data;
};
