import { Paginated } from 'types/academics';
import { PlatformOperator } from 'types/operator';
import { request } from './api';

const PATH = '/api/v1/platform/operators';

export const listOperators = (page = 1) =>
  request<Paginated<PlatformOperator>>(`${PATH}?page=${page}`);
