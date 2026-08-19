import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { renderWithTheme } from 'test/renderWithTheme';
import { activeMembershipValueFor } from 'test/activeMembership';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { ActiveMembershipContext } from 'providers/ActiveMembershipContext';
import { Membership } from 'types/auth';
import { guardianMembership, ownerPendingMembership, staffMembership } from 'test/msw';
import DrawerItems from './DrawerItems';

const teacherMembership: Membership = {
  id: 15,
  school_id: staffMembership.school_id,
  school_name: staffMembership.school_name,
  role: 'teacher',
  status: 'active',
  email: 'teacher@example.com',
  role_template: {
    id: 103,
    name: 'Professor',
    system_key: 'teacher',
    is_system: true,
  },
  is_owner: false,
  segment_id: null,
  display_title: 'Professor',
  permissions: ['teach'],
  permission_sources: { teach: 'template' },
};

const billingMembership: Membership = {
  ...ownerPendingMembership,
  school_onboarding_status: 'active',
  permissions: ['manage_billing', 'manage_people', 'view_billing_summary'],
  permission_sources: {
    manage_billing: 'template',
    manage_people: 'template',
    view_billing_summary: 'template',
  },
};

const authValueFor = (memberships: Membership[]): AuthContextValue => ({
  user: {
    id: 1,
    email: memberships[0]?.email ?? 'user@example.com',
    status: 'active',
    memberships,
    guardian_profiles: [],
  },
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
});

const renderDrawer = (memberships: Membership[], selectedId?: number) =>
  renderWithTheme(
    <MemoryRouter>
      <AuthContext.Provider value={authValueFor(memberships)}>
        <ActiveMembershipContext.Provider
          value={activeMembershipValueFor(memberships, selectedId ?? memberships[0]?.id ?? null)}
        >
          <DrawerItems />
        </ActiveMembershipContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );

describe('DrawerItems permission gating', () => {
  it('shows people routes to a secretary with manage_people', () => {
    renderDrawer([staffMembership]);

    expect(screen.getByRole('link', { name: 'Responsáveis' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Estudantes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Colaboradores' })).toBeInTheDocument();
  });

  it('does not offer Equipe in the sidebar', () => {
    renderDrawer([staffMembership]);

    expect(screen.queryByRole('link', { name: 'Equipe' })).not.toBeInTheDocument();
  });

  it('hides people routes from a teacher without manage_people', () => {
    renderDrawer([teacherMembership]);

    expect(screen.queryByRole('link', { name: 'Responsáveis' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Estudantes' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Colaboradores' })).toBeInTheDocument();
  });

  it('shows billing routes to a user with manage_billing', () => {
    renderDrawer([billingMembership]);

    expect(screen.getByRole('link', { name: 'Boletos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Planos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contrato' })).toBeInTheDocument();
  });

  it('hides billing routes from a user without manage_billing', () => {
    renderDrawer([teacherMembership]);

    expect(screen.queryByRole('link', { name: 'Boletos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Planos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Contrato' })).not.toBeInTheDocument();
  });

  it('shows School Lab subscription to manage_school_settings', () => {
    const settingsMembership: Membership = {
      ...ownerPendingMembership,
      school_onboarding_status: 'active',
      permissions: ['manage_school_settings'],
      permission_sources: { manage_school_settings: 'owner' },
    };

    renderDrawer([settingsMembership]);
    expect(screen.getByRole('link', { name: 'Assinatura School Lab' })).toHaveAttribute(
      'href',
      '/assinatura',
    );
    expect(screen.queryByRole('link', { name: 'Boletos' })).not.toBeInTheDocument();
  });

  it('hides School Lab subscription from manage_billing-only staff', () => {
    renderDrawer([billingMembership]);
    expect(screen.queryByRole('link', { name: 'Assinatura School Lab' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Boletos' })).toBeInTheDocument();
  });
});

describe('DrawerItems guardian audience', () => {
  it('shows only guardian destinations for an active Responsável context', () => {
    renderDrawer([guardianMembership]);

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Meus boletos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Preceptoria' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Meus pedidos' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Estudantes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Colaboradores' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Boletos' })).not.toBeInTheDocument();
  });

  it('updates the menu when a dual-role user switches active membership', () => {
    const { rerender } = renderDrawer([staffMembership, guardianMembership], staffMembership.id);

    expect(screen.getByRole('link', { name: 'Estudantes' })).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AuthContext.Provider value={authValueFor([staffMembership, guardianMembership])}>
          <ActiveMembershipContext.Provider
            value={activeMembershipValueFor(
              [staffMembership, guardianMembership],
              guardianMembership.id,
            )}
          >
            <DrawerItems />
          </ActiveMembershipContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: 'Estudantes' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Meus pedidos' })).toBeInTheDocument();
  });
});
