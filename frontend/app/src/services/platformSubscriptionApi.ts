import { Paginated } from 'types/academics';
import {
  SchoolChangePlanPayload,
  SchoolCheckoutPayload,
  SchoolCheckoutSession,
  SchoolPlatformInvoice,
  SchoolPlatformPlan,
  SchoolPlatformSubscription,
} from 'types/platformSubscription';
import { request } from './api';

const subscriptionPath = (schoolId: number) =>
  `/api/v1/schools/${schoolId}/platform_subscription`;

const plansPath = (schoolId: number) => `/api/v1/schools/${schoolId}/platform_plans`;

/** GET school-scoped SaaS catalog (`key`, `name`, interval prices). */
export const listSchoolPlatformPlans = async (
  schoolId: number,
): Promise<SchoolPlatformPlan[]> => {
  const response = await request<{ data: SchoolPlatformPlan[] }>(plansPath(schoolId));

  return response.data;
};

/** GET current kept subscription. `data: null` when the school has none. */
export const getSchoolPlatformSubscription = async (
  schoolId: number,
): Promise<SchoolPlatformSubscription | null> => {
  const response = await request<{ data: SchoolPlatformSubscription | null }>(
    subscriptionPath(schoolId),
  );

  return response.data;
};

export const createSchoolCheckoutSession = async (
  schoolId: number,
  payload: SchoolCheckoutPayload,
): Promise<SchoolCheckoutSession> => {
  const response = await request<{ data: SchoolCheckoutSession }>(
    `${subscriptionPath(schoolId)}/checkout`,
    {
      method: 'POST',
      body: payload,
    },
  );

  return response.data;
};

export const changeSchoolPlatformPlan = async (
  schoolId: number,
  payload: SchoolChangePlanPayload,
): Promise<SchoolPlatformSubscription> => {
  const response = await request<{ data: SchoolPlatformSubscription }>(
    `${subscriptionPath(schoolId)}/change_plan`,
    {
      method: 'POST',
      body: payload,
    },
  );

  return response.data;
};

export const cancelSchoolPlatformSubscription = async (
  schoolId: number,
  atPeriodEnd = true,
): Promise<SchoolPlatformSubscription> => {
  const response = await request<{ data: SchoolPlatformSubscription }>(
    `${subscriptionPath(schoolId)}/cancel`,
    {
      method: 'POST',
      body: { at_period_end: atPeriodEnd },
    },
  );

  return response.data;
};

export const listSchoolPlatformInvoices = (schoolId: number, page = 1) => {
  const params = new URLSearchParams({ page: String(page) });

  return request<Paginated<SchoolPlatformInvoice>>(
    `${subscriptionPath(schoolId)}/invoices?${params.toString()}`,
  );
};
