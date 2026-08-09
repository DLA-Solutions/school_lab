import {
  BillingPlanListResponse,
  Contract,
  ContractListResponse,
  ContractPayload,
  ContractResponse,
} from 'types/contract';
import { request } from './api';

const collectionPath = (schoolId: number) => `/api/v1/schools/${schoolId}/billing/contracts`;

export interface ListContractsParams {
  schoolId: number;
  /** Narrows to the contracts of one guardian's children. */
  guardianId?: number;
  signatureStatus?: Contract['signature_status'];
  page?: number;
}

/** GET /api/v1/schools/:school_id/billing/contracts — newest first. */
export const listContracts = ({
  schoolId,
  guardianId,
  signatureStatus,
  page = 1,
}: ListContractsParams) => {
  const query = new URLSearchParams({ page: String(page) });
  if (guardianId !== undefined) {
    query.set('guardian_id', String(guardianId));
  }
  if (signatureStatus) {
    query.set('signature_status', signatureStatus);
  }

  return request<ContractListResponse>(`${collectionPath(schoolId)}?${query}`);
};

/**
 * POST /api/v1/schools/:school_id/billing/contracts — sends a contract for signature. The API
 * forces `pending_signature` and stamps `sent_at`, whatever the caller passes.
 */
export const sendContract = async (
  schoolId: number,
  contract: ContractPayload,
): Promise<Contract> => {
  const response = await request<ContractResponse>(collectionPath(schoolId), {
    method: 'POST',
    body: { contract },
  });

  return response.data;
};

/**
 * POST /api/v1/schools/:school_id/billing/contracts/:id/sign — records that the family returned
 * the signed contract. Stands in for an e-signature callback until a provider is integrated.
 */
export const signContract = async (schoolId: number, id: number): Promise<Contract> => {
  const response = await request<ContractResponse>(`${collectionPath(schoolId)}/${id}/sign`, {
    method: 'POST',
  });

  return response.data;
};

/** GET /api/v1/schools/:school_id/billing/plans — the plans a contract can be attached to. */
export const listBillingPlans = (schoolId: number) =>
  request<BillingPlanListResponse>(`/api/v1/schools/${schoolId}/billing/plans?page=1`);
