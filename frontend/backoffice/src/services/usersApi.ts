import { Paginated } from 'types/academics';
import { PlatformUser, UserStatus } from 'types/user';
import { request } from './api';

const PATH = '/api/v1/users';

export type UserListFilters = {
  q?: string;
  status?: UserStatus | '';
};

export const listUsers = (page = 1, filters: UserListFilters = {}) => {
  const params = new URLSearchParams({ page: String(page) });

  if (filters.q) {
    params.set('q', filters.q);
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  return request<Paginated<PlatformUser>>(`${PATH}?${params.toString()}`);
};

export const disableUser = (id: number) =>
  request<null>(`${PATH}/${id}/disable`, { method: 'POST' });

export const enableUser = (id: number) =>
  request<null>(`${PATH}/${id}/enable`, { method: 'POST' });
