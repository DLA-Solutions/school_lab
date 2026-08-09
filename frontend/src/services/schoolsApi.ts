import { Paginated } from 'types/academics';
import { School, SchoolPayload } from 'types/school';
import { request } from './api';

/**
 * The school register is not school-scoped: `SchoolPolicy` returns every school to a backoffice
 * user, and only the ones they administer to a school admin.
 */
const PATH = '/api/v1/schools';

export const listSchools = (page = 1) => request<Paginated<School>>(`${PATH}?page=${page}`);

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
