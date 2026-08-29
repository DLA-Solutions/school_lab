import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import {
  EXPIRED_INVITE_TOKEN,
  INVITEE_EMAIL,
  INVITEE_PASSWORD,
  VALID_INVITE_TOKEN,
  HttpResponse,
  apiUrl,
  http,
  server,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { ACCESS_EXPIRES_AT, FRESH_ACCESS_TOKEN, invitedStaffMembership } from 'test/msw/handlers';
import { Membership } from 'types/auth';
import InviteAccept from './InviteAccept';
import paths from 'routes/paths';

const user = userEvent.setup({ delay: null });

const guestAuth: AuthContextValue = {
  user: null,
  status: 'unauthenticated',
  isAuthenticated: false,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const renderPage = (initialPath: string, auth: AuthContextValue = guestAuth) =>
  renderWithTheme(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthContext.Provider value={auth}>
        <Routes>
          <Route path={paths.inviteAccept} element={<InviteAccept />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );

const passwordInput = () => document.getElementById('password') as HTMLInputElement;

const backofficeMembership: Membership = {
  id: 1,
  school_id: 0,
  role: 'backoffice',
  status: 'active',
  email: 'admin@example.com',
  school_name: null,
  role_template: null,
  permissions: [],
  is_owner: null,
  segment_id: null,
  display_title: null,
  permission_sources: {},
  school_onboarding_status: 'active',
};

describe('InviteAccept', () => {
  it('accepts a valid invite token and activates membership', async () => {
    const login = vi.fn().mockImplementation(async () => {
      setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
    });
    const refreshUser = vi.fn().mockResolvedValue({
      id: 3,
      email: INVITEE_EMAIL,
      status: 'active',
      memberships: [{ ...invitedStaffMembership, status: 'active' }],
      guardian_profiles: [],
    });

    renderPage(`${paths.inviteAccept}?token=${VALID_INVITE_TOKEN}&email=${INVITEE_EMAIL}`, {
      ...guestAuth,
      login,
      refreshUser,
    });

    await user.type(screen.getByLabelText(/nome completo/i), 'Maria Silva');
    await user.type(passwordInput(), INVITEE_PASSWORD);
    await user.click(screen.getByRole('button', { name: /concluir convite/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: INVITEE_EMAIL,
        password: INVITEE_PASSWORD,
      });
    });
    expect(refreshUser).toHaveBeenCalled();
  });

  it('signs in as the invitee even when another session is active', async () => {
    const login = vi.fn().mockImplementation(async () => {
      setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
    });
    const refreshUser = vi.fn().mockResolvedValue({
      id: 3,
      email: INVITEE_EMAIL,
      status: 'active',
      memberships: [{ ...invitedStaffMembership, status: 'active' }],
      guardian_profiles: [],
    });

    renderPage(`${paths.inviteAccept}?token=${VALID_INVITE_TOKEN}&email=${INVITEE_EMAIL}`, {
      user: {
        id: 99,
        email: 'admin@example.com',
        status: 'active',
        memberships: [backofficeMembership],
        guardian_profiles: [],
      },
      status: 'authenticated',
      isAuthenticated: true,
      login,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      refreshUser,
    });

    await user.type(screen.getByLabelText(/nome completo/i), 'Maria Silva');
    await user.type(passwordInput(), INVITEE_PASSWORD);
    await user.click(screen.getByRole('button', { name: /concluir convite/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: INVITEE_EMAIL,
        password: INVITEE_PASSWORD,
      });
    });
  });

  it('recovers when the invite token was already consumed', async () => {
    const login = vi.fn().mockImplementation(async () => {
      setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
    });
    const refreshUser = vi.fn().mockResolvedValue({
      id: 3,
      email: INVITEE_EMAIL,
      status: 'active',
      memberships: [{ ...invitedStaffMembership, status: 'invited', school_onboarding_status: 'pending_handoff' }],
      guardian_profiles: [],
    });

    server.use(
      http.post(apiUrl('/api/v1/auth/invite/accept'), () =>
        HttpResponse.json(
          {
            error: {
              code: 'invalid_invite_token',
              message: 'Convite inválido ou expirado.',
              details: {},
            },
          },
          { status: 401 },
        ),
      ),
    );

    renderPage(`${paths.inviteAccept}?token=${EXPIRED_INVITE_TOKEN}&email=${INVITEE_EMAIL}`, {
      ...guestAuth,
      login,
      refreshUser,
    });

    await user.type(screen.getByLabelText(/nome completo/i), 'Maria Silva');
    await user.type(passwordInput(), INVITEE_PASSWORD);
    await user.click(screen.getByRole('button', { name: /concluir convite/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: INVITEE_EMAIL,
        password: INVITEE_PASSWORD,
      });
      expect(refreshUser).toHaveBeenCalled();
    });
  });

  it('shows pt-BR error for invalid invite token', async () => {
    renderPage(`${paths.inviteAccept}?token=${EXPIRED_INVITE_TOKEN}&email=${INVITEE_EMAIL}`);

    await user.type(screen.getByLabelText(/nome completo/i), 'Maria Silva');
    await user.type(passwordInput(), INVITEE_PASSWORD);
    await user.click(screen.getByRole('button', { name: /concluir convite/i }));

    expect(
      await screen.findByText(/convite é inválido ou expirou/i),
    ).toBeInTheDocument();
  });

  it('blocks submit when password is too short', async () => {
    renderPage(`${paths.inviteAccept}?token=${VALID_INVITE_TOKEN}&email=${INVITEE_EMAIL}`);

    await user.type(passwordInput(), 'short');
    await user.click(screen.getByRole('button', { name: /concluir convite/i }));

    expect(await screen.findByText(/pelo menos 8 caracteres/i)).toBeInTheDocument();
  });

  it('surfaces server validation errors', async () => {
    server.use(
      http.post(apiUrl('/api/v1/auth/invite/accept'), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Não foi possível salvar.',
              details: { name: ["can't be blank"] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    renderPage(`${paths.inviteAccept}?token=${VALID_INVITE_TOKEN}&email=${INVITEE_EMAIL}`);

    await user.type(passwordInput(), INVITEE_PASSWORD);
    await user.click(screen.getByRole('button', { name: /concluir convite/i }));

    expect(await screen.findByText(/informe seu nome completo/i)).toBeInTheDocument();
  });
});
