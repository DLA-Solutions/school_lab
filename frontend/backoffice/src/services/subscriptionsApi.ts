import { Paginated } from 'types/academics';
import {
  PlatformPlan,
  PlatformSubscription,
  SubscriptionListFilters,
  SubscriptionPayload,
  SubscriptionUpdatePayload,
} from 'types/subscription';
import { request } from './api';

const SUBSCRIPTIONS_PATH = '/api/v1/platform/subscriptions';
const PLANS_PATH = '/api/v1/platform/plans';

export const listPlans = async (): Promise<PlatformPlan[]> => {
  const response = await request<{ data: PlatformPlan[] }>(PLANS_PATH);
  return response.data;
};

export const listSubscriptions = (page = 1, filters: SubscriptionListFilters = {}) => {
  const params = new URLSearchParams({ page: String(page) });

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.school_id?.trim()) {
    params.set('school_id', filters.school_id.trim());
  }

  return request<Paginated<PlatformSubscription>>(`${SUBSCRIPTIONS_PATH}?${params.toString()}`);
};

export const getSubscription = async (id: number): Promise<PlatformSubscription> => {
  const response = await request<{ data: PlatformSubscription }>(`${SUBSCRIPTIONS_PATH}/${id}`);
  return response.data;
};

export const createSubscription = async (
  payload: SubscriptionPayload,
): Promise<PlatformSubscription> => {
  const response = await request<{ data: PlatformSubscription }>(SUBSCRIPTIONS_PATH, {
    method: 'POST',
    body: { subscription: payload },
  });

  return response.data;
};

export const updateSubscription = async (
  id: number,
  payload: SubscriptionUpdatePayload,
): Promise<PlatformSubscription> => {
  const response = await request<{ data: PlatformSubscription }>(`${SUBSCRIPTIONS_PATH}/${id}`, {
    method: 'PATCH',
    body: { subscription: payload },
  });

  return response.data;
};
