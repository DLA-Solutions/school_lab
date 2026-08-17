import { SupportedCity } from 'types/supportedCity';
import { request } from './api';

export interface SearchSupportedCitiesParams {
  schoolId: number;
  query?: string;
  state?: string;
  code?: number;
}

/** GET .../billing/fiscal/supported_cities */
export const searchSupportedCities = async ({
  schoolId,
  query,
  state,
  code,
}: SearchSupportedCitiesParams): Promise<SupportedCity[]> => {
  const params = new URLSearchParams();
  if (query?.trim()) {
    params.set('query', query.trim());
  }
  if (state?.trim()) {
    params.set('state', state.trim().toUpperCase());
  }
  if (code !== undefined) {
    params.set('code', String(code));
  }

  const queryString = params.toString();
  const response = await request<{ data: SupportedCity[] }>(
    `/api/v1/schools/${schoolId}/billing/fiscal/supported_cities${queryString ? `?${queryString}` : ''}`,
  );

  return response.data;
};
