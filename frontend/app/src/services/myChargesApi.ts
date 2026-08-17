import { Paginated } from 'types/academics';
import { MyCharge, MyChargeHistory } from 'types/myCharge';
import { request } from './api';

const basePath = (schoolId: number) => `/api/v1/schools/${schoolId}/me/charges`;

export interface ListMyChargesParams {
  schoolId: number;
  page?: number;
  /** Narrows to one linked child. */
  studentId?: number;
}

const listQuery = ({ page = 1, studentId }: Omit<ListMyChargesParams, 'schoolId'>) => {
  const query = new URLSearchParams({ page: String(page) });
  if (studentId !== undefined) {
    query.set('student_id', String(studentId));
  }

  return query;
};

/** GET .../me/charges — pending and overdue only. */
export const listMyOpenCharges = ({ schoolId, page, studentId }: ListMyChargesParams) =>
  request<Paginated<MyCharge>>(`${basePath(schoolId)}?${listQuery({ page, studentId })}`);

/** GET .../me/charges/history — platform-paid charges only. */
export const listMyChargeHistory = ({ schoolId, page, studentId }: ListMyChargesParams) =>
  request<Paginated<MyChargeHistory>>(
    `${basePath(schoolId)}/history?${listQuery({ page, studentId })}`,
  );

/** GET .../me/charges/:id — detail with payment methods and mora rate. */
export const getMyCharge = async (schoolId: number, id: number): Promise<MyCharge> => {
  const response = await request<{ data: MyCharge }>(`${basePath(schoolId)}/${id}`);

  return response.data;
};

/** POST .../me/charges/:id/reissue — second copy boleto/Pix. */
export const reissueMyCharge = async (schoolId: number, id: number): Promise<MyCharge> => {
  const response = await request<{ data: MyCharge }>(`${basePath(schoolId)}/${id}/reissue`, {
    method: 'POST',
  });

  return response.data;
};
