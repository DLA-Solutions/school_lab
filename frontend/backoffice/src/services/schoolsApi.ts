import { Paginated } from 'types/academics';
import { SchoolOnboardingMode, SchoolOnboardingStatus } from 'types/onboarding';
import { CreateSchoolResult, School, SchoolDetail, SchoolPayload } from 'types/school';
import { getSchoolModules } from './modulesApi';
import { getActiveSchoolYear } from './schoolYearsApi';
import { request } from './api';

/**
 * The school register is not school-scoped: `SchoolPolicy` returns every school to a backoffice
 * user, and only the ones they administer to a school admin.
 */
const PATH = '/api/v1/schools';

export type SchoolListFilters = {
  q?: string;
  saas_plan?: string;
  created_after?: string;
  created_before?: string;
  discarded?: boolean;
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

  if (filters.q?.trim()) {
    params.set('q', filters.q.trim());
  }

  if (filters.saas_plan?.trim()) {
    params.set('saas_plan', filters.saas_plan.trim());
  }

  if (filters.created_after) {
    params.set('created_after', filters.created_after);
  }

  if (filters.created_before) {
    params.set('created_before', filters.created_before);
  }

  if (filters.discarded) {
    params.set('discarded', 'true');
  }

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

const DETAIL_INCLUDES = 'modules,active_school_year,aggregate_counts';

/**
 * GET /api/v1/schools/:id?include=… — backoffice tenant detail.
 * Composes from separate calls when the backend has not shipped include yet.
 */
export const getSchoolDetail = async (id: number): Promise<SchoolDetail> => {
  const response = await request<{ data: SchoolDetail }>(
    `${PATH}/${id}?include=${DETAIL_INCLUDES}`,
  );
  const detail = response.data;

  const needsModules = !detail.modules;
  const needsYear = detail.active_school_year === undefined;

  if (!needsModules && !needsYear) {
    return detail;
  }

  const [modules, activeSchoolYear] = await Promise.all([
    needsModules ? getSchoolModules(id).catch(() => undefined) : Promise.resolve(detail.modules),
    needsYear
      ? getActiveSchoolYear(id).catch(() => null)
      : Promise.resolve(detail.active_school_year ?? null),
  ]);

  return {
    ...detail,
    modules: modules ?? detail.modules,
    active_school_year: activeSchoolYear ?? detail.active_school_year ?? null,
  };
};

export const createSchool = async (school: SchoolPayload): Promise<CreateSchoolResult> => {
  const response = await request<{ data: School; meta?: CreateSchoolResult['meta'] }>(PATH, {
    method: 'POST',
    body: { school },
  });

  return { school: response.data, meta: response.meta };
};

export const updateSchool = async (id: number, school: SchoolPayload): Promise<School> => {
  const response = await request<{ data: School }>(`${PATH}/${id}`, {
    method: 'PATCH',
    body: { school },
  });

  return response.data;
};

export const deleteSchool = (id: number) => request<null>(`${PATH}/${id}`, { method: 'DELETE' });

/** POST /api/v1/schools/:id/restore — undiscard archived tenant (UC-BOE07). */
export const restoreSchool = async (id: number): Promise<School> => {
  const response = await request<{ data: School }>(`${PATH}/${id}/restore`, { method: 'POST' });

  return response.data;
};
