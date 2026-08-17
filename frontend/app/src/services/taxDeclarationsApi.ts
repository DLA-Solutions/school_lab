import {
  MyTaxDeclarationListResponse,
  TaxDeclarationEnsureResult,
  TaxDeclarationListItem,
  TaxDeclarationVersion,
} from 'types/taxDeclaration';
import { request, requestBlob } from './api';

const basePath = (schoolId: number) => `/api/v1/schools/${schoolId}/me/tax_declarations`;

export interface ListMyTaxDeclarationsParams {
  schoolId: number;
  page?: number;
}

const listQuery = ({ page = 1 }: Omit<ListMyTaxDeclarationsParams, 'schoolId'>) =>
  new URLSearchParams({ page: String(page) });

/** GET .../me/tax_declarations — own annual aggregates and active version metadata. */
export const listMyTaxDeclarations = ({ schoolId, page }: ListMyTaxDeclarationsParams) =>
  request<MyTaxDeclarationListResponse>(`${basePath(schoolId)}?${listQuery({ page })}`);

/** GET .../me/tax_declarations/:id — aggregate detail with active version metadata. */
export const getMyTaxDeclaration = async (
  schoolId: number,
  taxDeclarationId: number,
): Promise<TaxDeclarationListItem> => {
  const response = await request<{ data: TaxDeclarationListItem }>(
    `${basePath(schoolId)}/${taxDeclarationId}`,
  );

  return response.data;
};

/** GET .../me/tax_declarations/:id/versions — immutable version list. */
export const listMyTaxDeclarationVersions = async (
  schoolId: number,
  taxDeclarationId: number,
  page = 1,
): Promise<{ data: TaxDeclarationVersion[]; meta: MyTaxDeclarationListResponse['meta'] }> => {
  const query = new URLSearchParams({ page: String(page) });

  return request(`${basePath(schoolId)}/${taxDeclarationId}/versions?${query}`);
};

/** GET .../me/tax_declarations/:id/versions/:versionId — exact version detail. */
export const getMyTaxDeclarationVersion = async (
  schoolId: number,
  taxDeclarationId: number,
  versionId: number,
): Promise<TaxDeclarationVersion> => {
  const response = await request<{ data: TaxDeclarationVersion }>(
    `${basePath(schoolId)}/${taxDeclarationId}/versions/${versionId}`,
  );

  return response.data;
};

/** POST .../me/tax_declarations — idempotently ensure a closed calendar year is generated. */
export const ensureMyTaxDeclaration = async (
  schoolId: number,
  calendarYear: number,
): Promise<TaxDeclarationEnsureResult> => {
  const response = await request<{ data: TaxDeclarationEnsureResult }>(basePath(schoolId), {
    method: 'POST',
    body: { tax_declaration: { calendar_year: calendarYear } },
  });

  return response.data;
};

/** GET .../me/tax_declarations/:id/versions/:versionId/pdf — stored PDF bytes (audited). */
export const fetchMyTaxDeclarationPdf = (
  schoolId: number,
  taxDeclarationId: number,
  versionId: number,
) => requestBlob(`${basePath(schoolId)}/${taxDeclarationId}/versions/${versionId}/pdf`);
