import { Membership } from 'types/auth';

export const isBackofficeUser = (memberships: Membership[]): boolean =>
  memberships.some((membership) => membership.role === 'backoffice' && membership.status === 'active');
