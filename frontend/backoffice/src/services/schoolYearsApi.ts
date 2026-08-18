import {
  ActivateSchoolYearResult,
  CreateSchoolYearPayload,
  SchoolYear,
} from 'types/schoolYear';
import { ApiError, request } from './api';

const yearsPath = (schoolId: number) => `/api/v1/schools/${schoolId}/school_years`;

/** POST /api/v1/schools/:school_id/school_years — create draft year with period template. */
export const createSchoolYear = async (
  schoolId: number,
  payload: CreateSchoolYearPayload,
): Promise<SchoolYear> => {
  const response = await request<{ data: SchoolYear }>(yearsPath(schoolId), {
    method: 'POST',
    body: payload,
  });

  return response.data;
};

/** POST /api/v1/schools/:school_id/school_years/:id/activate — draft → active. */
export const activateSchoolYear = async (
  schoolId: number,
  yearId: number,
): Promise<ActivateSchoolYearResult> => {
  const response = await request<{ data: ActivateSchoolYearResult }>(
    `${yearsPath(schoolId)}/${yearId}/activate`,
    { method: 'POST' },
  );

  return response.data;
};

/** GET /api/v1/schools/:school_id/school_years/active — active year summary. */
export const getActiveSchoolYear = async (schoolId: number): Promise<SchoolYear | null> => {
  try {
    const response = await request<{ data: SchoolYear }>(`${yearsPath(schoolId)}/active`);

    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.code === 'no_active_school_year') {
      return null;
    }

    throw error;
  }
};
