import { Paginated } from 'types/academics';
import { SchoolOnboardingMode, SchoolOnboardingStatus } from 'types/onboarding';
import { School, SchoolPayload } from 'types/school';
import { request } from './api';

/**
 * The school register is not school-scoped: `SchoolPolicy` returns every school to a backoffice
 * user, and only the ones they administer to a school admin.
 */
const PATH = '/api/v1/schools';

export type SchoolListFilters = {
  onboarding_status?: SchoolOnboardingStatus | '';
  onboarding_mode?: SchoolOnboardingMode | '';
};

const ONBOARDING_STATUSES: SchoolOnboardingStatus[] = ['provisioning', 'pending_handoff', 'active'];

export type OnboardingStatusCounts = Record<SchoolOnboardingStatus, number>;

/** Uses `meta.total` from the school register list — same source of truth as the register. */
export const fetchOnboardingStatusCounts = async (): Promise<OnboardingStatusCounts> => {
  const responses = await Promise.all(
    ONBOARDING_STATUSES.map((status) => listSchools(1, { onboarding_status: status })),
  );

  return Object.fromEntries(
    ONBOARDING_STATUSES.map((status, index) => [status, responses[index]!.meta.total]),
  ) as OnboardingStatusCounts;
};

export const listSchools = (page = 1, filters: SchoolListFilters = {}) => {
  const params = new URLSearchParams({ page: String(page) });

  if (filters.onboarding_status) {
    params.set('onboarding_status', filters.onboarding_status);
  }

  if (filters.onboarding_mode) {
    params.set('onboarding_mode', filters.onboarding_mode);
  }

  return request<Paginated<School>>(`${PATH}?${params.toString()}`);
};

export const getSchool = async (id: number): Promise<School> => {
  const response = await request<{ data: School }>(`${PATH}/${id}`);

  return response.data;
};

export const createSchool = async (school: SchoolPayload): Promise<School> => {
  const response = await request<{ data: School }>(PATH, { method: 'POST', body: { school } });

  return response.data;
};

export const updateSchool = async (id: number, school: SchoolPayload): Promise<School> => {
  const response = await request<{ data: School }>(`${PATH}/${id}`, {
    method: 'PATCH',
    body: { school },
  });

  return response.data;
};

export const deleteSchool = (id: number) => request<null>(`${PATH}/${id}`, { method: 'DELETE' });
