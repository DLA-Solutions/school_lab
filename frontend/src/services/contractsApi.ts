import {
  BillingPlanListResponse,
  PlanDiscount,
  Contract,
  ContractListResponse,
  ContractPayload,
  ContractResponse,
} from 'types/contract';
import { BillingPlan } from 'types/contract';
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
 * POST /api/v1/schools/:school_id/billing/contracts — records the contract. It starts awaiting
 * signature whatever the caller passes; dispatching it is a separate call, so a provider outage
 * leaves a contract to retry rather than nothing.
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
 * POST /api/v1/schools/:school_id/billing/contracts/:id/send_for_signature — renders the
 * agreement and sends it to the guardians through the school's e-signature provider.
 */
export const dispatchContract = async (schoolId: number, id: number): Promise<Contract> => {
  const response = await request<ContractResponse>(
    `${collectionPath(schoolId)}/${id}/send_for_signature`,
    { method: 'POST' },
  );

  return response.data;
};

/**
 * POST /api/v1/schools/:school_id/billing/contracts/:id/sign — records a signature by hand, for a
 * contract returned outside the provider (a scanned copy, a school not yet integrated).
 */
export const signContract = async (schoolId: number, id: number): Promise<Contract> => {
  const response = await request<ContractResponse>(`${collectionPath(schoolId)}/${id}/sign`, {
    method: 'POST',
  });

  return response.data;
};

/* ------------------------------------------------------------- plan discounts */

const discountsPath = (schoolId: number) =>
  `/api/v1/schools/${schoolId}/billing/plan_discounts`;

export const listPlanDiscounts = (schoolId: number) =>
  request<{ data: PlanDiscount[]; meta: { page: number; per_page: number; total: number } }>(
    `${discountsPath(schoolId)}?page=1`,
  );

export const createPlanDiscount = async (
  schoolId: number,
  discount: { name: string; percent: number },
): Promise<PlanDiscount> => {
  const response = await request<{ data: PlanDiscount }>(discountsPath(schoolId), {
    method: 'POST',
    body: { plan_discount: discount },
  });

  return response.data;
};

export const updatePlanDiscount = async (
  schoolId: number,
  id: number,
  discount: { name: string; percent: number },
): Promise<PlanDiscount> => {
  const response = await request<{ data: PlanDiscount }>(`${discountsPath(schoolId)}/${id}`, {
    method: 'PATCH',
    body: { plan_discount: discount },
  });

  return response.data;
};

export const deletePlanDiscount = (schoolId: number, id: number) =>
  request<null>(`${discountsPath(schoolId)}/${id}`, { method: 'DELETE' });

/** Creates whatever of the standard bands the school is missing. */
export const provisionDefaultDiscounts = async (schoolId: number): Promise<PlanDiscount[]> => {
  const response = await request<{ data: PlanDiscount[] }>(
    `${discountsPath(schoolId)}/provision_defaults`,
    { method: 'POST' },
  );

  return response.data;
};

/* ---------------------------------------------------------------- plans */

export const createBillingPlan = async (
  schoolId: number,
  plan: { name: string; base_amount_cents: number; plan_type?: string },
): Promise<BillingPlan> => {
  const response = await request<{ data: BillingPlan }>(
    `/api/v1/schools/${schoolId}/billing/plans`,
    { method: 'POST', body: { billing_plan: plan } },
  );

  return response.data;
};

export const updateBillingPlan = async (
  schoolId: number,
  id: number,
  plan: { name: string; base_amount_cents: number },
): Promise<BillingPlan> => {
  const response = await request<{ data: BillingPlan }>(
    `/api/v1/schools/${schoolId}/billing/plans/${id}`,
    { method: 'PATCH', body: { billing_plan: plan } },
  );

  return response.data;
};

export const deleteBillingPlan = (schoolId: number, id: number) =>
  request<null>(`/api/v1/schools/${schoolId}/billing/plans/${id}`, { method: 'DELETE' });

/** GET /api/v1/schools/:school_id/billing/plans — the plans a contract can be attached to. */
export const listBillingPlans = (schoolId: number) =>
  request<BillingPlanListResponse>(`/api/v1/schools/${schoolId}/billing/plans?page=1`);
