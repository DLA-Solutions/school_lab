import {
  ContractTemplate,
  ContractTemplatePayload,
  ContractTemplatePreview,
} from 'types/contractTemplate';
import { request } from './api';

const path = (schoolId: number) =>
  `/api/v1/schools/${schoolId}/billing/contract_template`;

/** GET — the API returns a starting agreement when the school has never saved one. */
export const fetchContractTemplate = async (schoolId: number): Promise<ContractTemplate> => {
  const response = await request<{ data: ContractTemplate }>(path(schoolId));

  return response.data;
};

/**
 * PUT as multipart when a logo is attached, JSON otherwise — the file cannot ride in a
 * JSON body, and sending multipart for every save would be wasteful.
 */
export const saveContractTemplate = async (
  schoolId: number,
  payload: ContractTemplatePayload,
  logo?: File | null,
  removeLogo = false,
): Promise<ContractTemplate> => {
  if (logo) {
    const body = new FormData();
    body.append('contract_template[body_html]', payload.body_html);
    body.append('contract_template[logo]', logo);

    const response = await request<{ data: ContractTemplate }>(path(schoolId), {
      method: 'PUT',
      body,
    });

    return response.data;
  }

  const response = await request<{ data: ContractTemplate }>(path(schoolId), {
    method: 'PUT',
    // `remove_logo` only travels on the JSON path: a save that carries a new image is never
    // also removing one.
    body: { contract_template: { ...payload, remove_logo: removeLogo } },
  });

  return response.data;
};

/** GET .../preview — the finished document, with a real contract's data when one exists. */
export const previewContractTemplate = async (
  schoolId: number,
): Promise<ContractTemplatePreview> => {
  const response = await request<{ data: ContractTemplatePreview }>(`${path(schoolId)}/preview`);

  return response.data;
};
