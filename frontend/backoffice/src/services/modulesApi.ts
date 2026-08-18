import { SchoolModulesMap } from 'types/modules';
import { request } from './api';

const modulesPath = (schoolId: number) => `/api/v1/schools/${schoolId}/modules`;

/** GET /api/v1/schools/:id/modules — module enablement map (E1; backend gap if 404). */
export const getSchoolModules = async (schoolId: number): Promise<SchoolModulesMap> => {
  const response = await request<{ data: { modules: SchoolModulesMap } }>(modulesPath(schoolId));

  return response.data.modules;
};

/** PATCH /api/v1/schools/:id/modules — toggle module flags (UC-BO03). */
export const updateSchoolModules = async (
  schoolId: number,
  modules: Partial<SchoolModulesMap>,
): Promise<SchoolModulesMap> => {
  const response = await request<{ data: { modules: SchoolModulesMap } }>(modulesPath(schoolId), {
    method: 'PATCH',
    body: { modules },
  });

  return response.data.modules;
};
