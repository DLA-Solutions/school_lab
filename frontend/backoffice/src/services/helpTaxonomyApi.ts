import { Paginated } from 'types/academics';
import { HelpTaxonomyCategory, HelpTaxonomyCategoryPayload } from 'types/helpTaxonomy';
import { request } from './api';

const PATH = '/api/v1/platform/help_taxonomy/categories';

export const listHelpTaxonomyCategories = (page = 1) =>
  request<Paginated<HelpTaxonomyCategory>>(`${PATH}?page=${page}`);

export const getHelpTaxonomyCategory = async (id: number): Promise<HelpTaxonomyCategory> => {
  const response = await request<{ data: HelpTaxonomyCategory }>(`${PATH}/${id}`);
  return response.data;
};

export const createHelpTaxonomyCategory = async (
  payload: HelpTaxonomyCategoryPayload,
): Promise<HelpTaxonomyCategory> => {
  const response = await request<{ data: HelpTaxonomyCategory }>(PATH, {
    method: 'POST',
    body: { category: payload },
  });

  return response.data;
};

export const updateHelpTaxonomyCategory = async (
  id: number,
  payload: Partial<HelpTaxonomyCategoryPayload>,
): Promise<HelpTaxonomyCategory> => {
  const response = await request<{ data: HelpTaxonomyCategory }>(`${PATH}/${id}`, {
    method: 'PATCH',
    body: { category: payload },
  });

  return response.data;
};

export const deleteHelpTaxonomyCategory = (id: number) =>
  request<null>(`${PATH}/${id}`, { method: 'DELETE' });
