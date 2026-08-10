import { describe, expect, it } from 'vitest';
import { parseAuthUser, parseMembership } from 'services/parseAuthUser';

describe('parseMembership', () => {
  it('parses role template and permissions from GET /me', () => {
    const membership = parseMembership({
      id: 10,
      school_id: 42,
      school_name: 'Example School',
      role: 'staff',
      status: 'active',
      email: 'admin@example.com',
      role_template: {
        id: 1,
        name: 'Direção',
        system_key: 'director',
        is_system: true,
      },
      is_owner: true,
      segment_id: null,
      display_title: 'Diretor',
      permissions: ['manage_billing', 'manage_people'],
      permission_sources: { manage_billing: 'template' },
      school_onboarding_status: 'pending_handoff',
    });

    expect(membership.role_template).toEqual({
      id: 1,
      name: 'Direção',
      system_key: 'director',
      is_system: true,
    });
    expect(membership.permissions).toEqual(['manage_billing', 'manage_people']);
    expect(membership.is_owner).toBe(true);
    expect(membership.school_onboarding_status).toBe('pending_handoff');
  });

  it('keeps legacy memberships without optional fields safe', () => {
    const membership = parseMembership({
      id: 5,
      school_id: 1,
      role: 'guardian',
      status: 'active',
      email: 'maria@example.com',
    });

    expect(membership.role_template).toBeNull();
    expect(membership.permissions).toEqual([]);
    expect(membership.is_owner).toBeNull();
    expect(membership.school_onboarding_status).toBeUndefined();
  });
});

describe('parseAuthUser', () => {
  it('parses nested memberships', () => {
    const user = parseAuthUser({
      id: 1,
      email: 'admin@example.com',
      status: 'active',
      memberships: [
        {
          id: 10,
          school_id: 42,
          role: 'staff',
          status: 'active',
          permissions: ['manage_people'],
        },
      ],
      guardian_profiles: [],
    });

    expect(user).not.toBeNull();
    if (!user) {
      return;
    }
    expect(user.memberships[0].permissions).toEqual(['manage_people']);
  });
});
