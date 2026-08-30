import { School } from 'types/school';
import { request } from './api';

const base = (schoolId: number) => `/api/v1/schools/${schoolId}`;

export const getSchool = async (schoolId: number): Promise<School> => {
  const response = await request<{ data: School }>(base(schoolId));

  return response.data;
};

/** PUT .../schools/:id — cnpj and signature_email are the pair `signs_contracts?` requires. */
export const updateSchoolSigner = async (
  schoolId: number,
  params: { cnpj: string | null; signature_email: string | null },
): Promise<School> => {
  const response = await request<{ data: School }>(base(schoolId), {
    method: 'PUT',
    body: { school: params },
  });

  return response.data;
};
