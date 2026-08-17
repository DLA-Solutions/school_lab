import { Paginated } from 'types/academics';
import { ServiceInvoice } from 'types/serviceInvoice';
import { request, requestBlob } from './api';

const staffBasePath = (schoolId: number) =>
  `/api/v1/schools/${schoolId}/billing/service_invoices`;

const guardianBasePath = (schoolId: number) =>
  `/api/v1/schools/${schoolId}/me/service_invoices`;

export interface ListServiceInvoicesParams {
  schoolId: number;
  page?: number;
}

/** GET .../billing/service_invoices — staff list. */
export const listStaffServiceInvoices = ({ schoolId, page = 1 }: ListServiceInvoicesParams) =>
  request<Paginated<ServiceInvoice>>(`${staffBasePath(schoolId)}?page=${page}`);

/** GET .../billing/service_invoices/:id — staff detail. */
export const getStaffServiceInvoice = async (
  schoolId: number,
  id: number,
): Promise<ServiceInvoice> => {
  const response = await request<{ data: ServiceInvoice }>(`${staffBasePath(schoolId)}/${id}`);

  return response.data;
};

/** GET .../billing/service_invoices/:id/pdf */
export const downloadStaffServiceInvoicePdf = (schoolId: number, id: number) =>
  requestBlob(`${staffBasePath(schoolId)}/${id}/pdf`);

/** GET .../me/service_invoices — guardian family-scoped list. */
export const listMyServiceInvoices = ({ schoolId, page = 1 }: ListServiceInvoicesParams) =>
  request<Paginated<ServiceInvoice>>(`${guardianBasePath(schoolId)}?page=${page}`);

/** GET .../me/service_invoices/:id/pdf */
export const downloadMyServiceInvoicePdf = (schoolId: number, id: number) =>
  requestBlob(`${guardianBasePath(schoolId)}/${id}/pdf`);
