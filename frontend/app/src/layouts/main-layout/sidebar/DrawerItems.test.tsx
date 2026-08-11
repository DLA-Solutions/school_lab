import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { Membership } from 'types/auth';
import { ownerPendingMembership, staffMembership } from 'test/msw';
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

const authValueFor = (membership: Membership): AuthContextValue => ({
  user: {
    id: 1,
    email: membership.email ?? 'user@example.com',
    status: 'active',
    memberships: [membership],
    guardian_profiles: [],
  },
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
});

const renderDrawer = (membership: Membership) =>
  renderWithTheme(
    <MemoryRouter>
      <AuthContext.Provider value={authValueFor(membership)}>
        <DrawerItems />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

describe('DrawerItems permission gating', () => {
  it('shows people routes to a secretary with manage_people', () => {
    renderDrawer(staffMembership);

    expect(screen.getByRole('link', { name: 'Responsáveis' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Estudantes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Equipe' })).toBeInTheDocument();
  });

  it('hides people routes from a teacher without manage_people', () => {
    renderDrawer(teacherMembership);

    expect(screen.queryByRole('link', { name: 'Responsáveis' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Estudantes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Equipe' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Colaboradores' })).toBeInTheDocument();
  });

  it('shows billing routes to a user with manage_billing', () => {
    renderDrawer(billingMembership);

    expect(screen.getByRole('link', { name: 'Boletos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Planos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contrato' })).toBeInTheDocument();
  });

  it('hides billing routes from a user without manage_billing', () => {
    renderDrawer(teacherMembership);

    expect(screen.queryByRole('link', { name: 'Boletos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Planos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Contrato' })).not.toBeInTheDocument();
  });
});
