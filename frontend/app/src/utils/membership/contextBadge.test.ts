import { describe, expect, it } from 'vitest';
import { guardianMembership, staffMembership } from 'test/msw';
import {
  membershipContextBadgeTooltip,
  membershipContextBadgeVariant,
} from './contextBadge';

const t = (key: string, params?: Record<string, string | number>) => {
  if (key === 'membership.contextTooltip' && params) {
    return `Você está como ${params.role} · ${params.school}`;
  }

  if (key === 'membership.contextTooltipRoleOnly' && params) {
    return `Você está como ${params.role}`;
  }

  return key;
};

describe('membershipContextBadgeVariant', () => {
  it('maps guardian memberships to the guardian badge variant', () => {
    expect(membershipContextBadgeVariant(guardianMembership)).toBe('guardian');
  });

  it('maps teacher memberships to the teacher badge variant', () => {
    expect(
      membershipContextBadgeVariant({
        ...staffMembership,
        role: 'teacher',
      }),
    ).toBe('teacher');
  });

  it('maps staff memberships to the staff badge variant', () => {
    expect(membershipContextBadgeVariant(staffMembership)).toBe('staff');
  });
});

describe('membershipContextBadgeTooltip', () => {
  it('includes the school name when present', () => {
    expect(
      membershipContextBadgeTooltip(staffMembership, t, [staffMembership]),
    ).toBe(`Você está como ${staffMembership.role_template?.name} · ${staffMembership.school_name}`);
  });
});
