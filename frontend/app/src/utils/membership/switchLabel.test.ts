import { describe, expect, it } from 'vitest';
import { Membership } from 'types/auth';
import { staffMembership } from 'test/msw';
import {
  membershipSwitchPrimary,
  membershipSwitchSecondary,
} from 'utils/membership/switchLabel';

const t = (key: string, params?: Record<string, string | number>) => {
  if (key === 'membership.switchSecondaryWithId' && params) {
    return `${params.schoolName} · escola ${params.schoolId}`;
  }

  const labels: Record<string, string> = {
    'common.staffRole': 'Equipe',
  };

  return labels[key] ?? key;
};

const directorMembership = (id: number, schoolId: number): Membership => ({
  ...staffMembership,
  id,
  school_id: schoolId,
  school_name: 'Colégio Nossa Senhora do Rosário',
  display_title: 'Diretor',
  role_template: {
    id: 99,
    name: 'Diretor',
    system_key: 'director',
    is_system: true,
  },
});

describe('membership switch labels', () => {
  it('uses display role as the primary label', () => {
    expect(membershipSwitchPrimary(staffMembership, t)).toBe('Secretária');
  });

  it('returns plain school name when labels are unique', () => {
    const siblings = [staffMembership, directorMembership(12, 4)];

    expect(membershipSwitchSecondary(staffMembership, t, siblings)).toBe('Example School — Downtown');
  });

  it('appends school id when primary and school name collide', () => {
    const first = directorMembership(20, 3);
    const second = directorMembership(21, 4);
    const siblings = [first, second];

    expect(membershipSwitchSecondary(first, t, siblings)).toBe(
      'Colégio Nossa Senhora do Rosário · escola 3',
    );
    expect(membershipSwitchSecondary(second, t, siblings)).toBe(
      'Colégio Nossa Senhora do Rosário · escola 4',
    );
  });
});
