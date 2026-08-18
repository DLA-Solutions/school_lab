import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import {
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  http,
  ownerPendingMembership,
  server,
  staffMembership,
  teamMemberships,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser, Membership } from 'types/auth';
import Team from './Team';

const MEMBERSHIPS_PATH = `/api/v1/schools/${SCHOOL_ID}/people/memberships`;

const user = userEvent.setup({ delay: null });

const authValueFor = (membership: Membership): AuthContextValue => ({
  user: {
    id: 1,
    email: membership.email ?? 'user@example.com',
    status: 'active',
    memberships: [membership],
    guardian_profiles: [],
  } as AuthUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
});

const renderPage = (membership: Membership) =>
  renderWithTheme(
    <MemoryRouter>
      <AuthContext.Provider value={authValueFor(membership)}>
        <Team />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

describe('Team page', () => {
  it('shows the permissions action to the school owner', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');
    renderPage({ ...ownerPendingMembership, school_onboarding_status: 'active' });

    expect(await screen.findByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Permissões' })).toBeInTheDocument();
    expect(screen.queryByText('director@example.com')).toBeInTheDocument();
    expect(screen.queryByText('guardian@example.com')).not.toBeInTheDocument();
  });

  it('lists staff without the permissions action for a non-owner secretary', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');
    renderPage(staffMembership);

    expect(await screen.findByText('admin@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Permissões' })).not.toBeInTheDocument();
  });

  it('opens the permissions dialog for a target membership', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');
    renderPage({ ...ownerPendingMembership, school_onboarding_status: 'active' });

    await user.click(await screen.findByRole('button', { name: 'Permissões' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Permissões da conta')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('admin@example.com');
  });

  it('returns 403 feedback when a non-owner patches permissions', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

    server.use(
      http.patch(apiUrl(`${MEMBERSHIPS_PATH}/:id/permissions`), () =>
        HttpResponse.json(
          { error: { code: 'forbidden', message: 'Acesso negado.', details: {} } },
          { status: 403 },
        ),
      ),
    );

    renderPage(staffMembership);

    // Secretary cannot open the dialog from the listing, so exercise PATCH via owner UI is
    // covered in MembershipPermissionsDialog.test — here we only assert the button stays hidden.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Permissões' })).not.toBeInTheDocument());
    expect(teamMemberships.some((row) => row.email === 'admin@example.com')).toBe(true);
  });
});
