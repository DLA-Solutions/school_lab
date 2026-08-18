import { Paginated } from 'types/academics';
import { AuditListFilters, PlatformAudit } from 'types/audit';
import { request } from './api';

const PATH = '/api/v1/platform/audits';

export const listAudits = (page = 1, filters: AuditListFilters = {}) => {
  const params = new URLSearchParams({ page: String(page) });

  if (filters.school_id?.trim()) {
    params.set('school_id', filters.school_id.trim());
  }

  if (filters.action?.trim()) {
    params.set('action', filters.action.trim());
  }

  if (filters.date_from) {
    params.set('date_from', filters.date_from);
  }

  if (filters.date_to) {
    params.set('date_to', filters.date_to);
  }

  return request<Paginated<PlatformAudit>>(`${PATH}?${params.toString()}`);
};
