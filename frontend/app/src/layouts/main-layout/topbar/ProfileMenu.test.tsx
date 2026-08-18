import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Membership } from 'types/auth';
import { renderWithTheme } from 'test/renderWithTheme';
import { activeMembershipValueFor } from 'test/activeMembership';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { ActiveMembershipContext } from 'providers/ActiveMembershipContext';
import { guardianMembership, staffMembership } from 'test/msw';
import ProfileMenu from './ProfileMenu';

const user = userEvent.setup();

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

const authValueFor = (memberships: typeof staffMembership[]): AuthContextValue => ({
  user: {
    id: 1,
    email: 'user@example.com',
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

const renderProfileMenu = (memberships: typeof staffMembership[], selectedId?: number) =>
  renderWithTheme(
    <MemoryRouter>
      <AuthContext.Provider value={authValueFor(memberships)}>
        <ActiveMembershipContext.Provider
          value={activeMembershipValueFor(memberships, selectedId ?? memberships[0]?.id ?? null)}
        >
          <ProfileMenu />
        </ActiveMembershipContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );

describe('ProfileMenu', () => {
  it('shows Responsável instead of the raw guardian role in pt-BR', async () => {
    renderProfileMenu([guardianMembership]);

    await user.click(screen.getByRole('button', { name: 'Perfil' }));

    expect(screen.getByText(/Responsável · Example School — Downtown/)).toBeInTheDocument();
    expect(screen.queryByText(/guardian/i)).not.toBeInTheDocument();
  });

  it('shows the translated logout label', async () => {
    renderProfileMenu([staffMembership]);

    await user.click(screen.getByRole('button', { name: 'Perfil' }));

    expect(screen.getByRole('menuitem', { name: 'Sair' })).toBeInTheDocument();
  });

  it('lists both memberships for a dual-role user', async () => {
    renderProfileMenu([staffMembership, guardianMembership], staffMembership.id);

    await user.click(screen.getByRole('button', { name: 'Perfil' }));

    expect(screen.getByText('Trocar perfil e escola')).toBeInTheDocument();
    expect(screen.getByText('Secretária')).toBeInTheDocument();
    expect(screen.getByText('Responsável')).toBeInTheDocument();
  });

  it('disambiguates duplicate role and school labels with school id', async () => {
    const firstDirector = directorMembership(20, 3);
    const secondDirector = directorMembership(21, 4);

    renderProfileMenu([firstDirector, secondDirector], firstDirector.id);

    await user.click(screen.getByRole('button', { name: 'Perfil' }));

    expect(screen.getByText(/Diretor · Colégio Nossa Senhora do Rosário · escola 3/)).toBeInTheDocument();
    expect(screen.getByText('Colégio Nossa Senhora do Rosário · escola 3')).toBeInTheDocument();
    expect(screen.getByText('Colégio Nossa Senhora do Rosário · escola 4')).toBeInTheDocument();
  });
});
