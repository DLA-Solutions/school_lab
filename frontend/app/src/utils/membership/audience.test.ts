import { describe, expect, it } from 'vitest';
import { guardianMembership, staffMembership } from 'test/msw';
import {
  membershipDisplayRole,
  membershipAudience,
  reconcileActiveMembership,
} from 'utils/membership/audience';

const t = (key: string) => {
  const labels: Record<string, string> = {
    'common.guardian': 'Responsável',
    'common.teacherRole': 'Professor',
    'common.staffRole': 'Equipe',
  };

  return labels[key] ?? key;
};

describe('membership audience helpers', () => {
  it('labels guardian memberships as Responsável', () => {
    expect(membershipDisplayRole(guardianMembership, t)).toBe('Responsável');
  });

  it('uses display_title for staff templates when present', () => {
    expect(membershipDisplayRole(staffMembership, t)).toBe('Secretária');
  });

  it('resolves audience from membership role', () => {
    expect(membershipAudience(guardianMembership)).toBe('guardian');
    expect(membershipAudience(staffMembership)).toBe('staff');
  });

  it('preserves a valid stored membership id', () => {
    const selected = reconcileActiveMembership(
      [staffMembership, guardianMembership],
      guardianMembership.id,
    );

    expect(selected?.id).toBe(guardianMembership.id);
  });

  it('auto-selects the only eligible membership', () => {
    expect(reconcileActiveMembership([guardianMembership], null)?.id).toBe(guardianMembership.id);
  });

  it('clears stale stored ids that no longer exist on /me', () => {
    expect(reconcileActiveMembership([staffMembership], 999)).toEqual(staffMembership);
  });
});
