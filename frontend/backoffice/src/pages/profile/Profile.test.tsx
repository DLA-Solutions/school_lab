import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  ACCESS_EXPIRES_AT,
  FRESH_ACCESS_TOKEN,
  HttpResponse,
  apiUrl,
  backofficeUser,
  http,
  jsonError,
  server,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import paths from 'routes/paths';
import Profile from './Profile';

const PASSWORD_PATH = '/api/v1/auth/password';

const authValue = (overrides: Partial<AuthContextValue> = {}): AuthContextValue => ({
  user: backofficeUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  ...overrides,
});

const renderPage = (auth: AuthContextValue = authValue()) => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter initialEntries={[paths.profile]}>
      <AuthContext.Provider value={auth}>
        <Profile />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

const fillForm = async (user: ReturnType<typeof userEvent.setup>, current = 'current-secret') => {
  await user.type(screen.getByLabelText(/senha atual/i), current);
  await user.type(screen.getByLabelText(/^nova senha/i), 'novaSenha123');
  await user.type(screen.getByLabelText(/confirmar nova senha/i), 'novaSenha123');
};

describe('Profile page', () => {
  it('shows the registration details from the signed-in user', () => {
    renderPage();

    expect(screen.getByText(backofficeUser.email)).toBeInTheDocument();
    expect(screen.getByText(String(backofficeUser.id))).toBeInTheDocument();
  });

  it('changes the password and ends the session, since the API revokes every token', async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    let body: Record<string, unknown> | null = null;

    server.use(
      http.put(apiUrl(PASSWORD_PATH), async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderPage(authValue({ logout }));
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /alterar senha/i }));

    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(body).toEqual({
      current_password: 'current-secret',
      password: 'novaSenha123',
      password_confirmation: 'novaSenha123',
    });
  });

  it('reports a wrong current password without dropping the session', async () => {
    const user = userEvent.setup();
    const logout = vi.fn();

    server.use(
      http.put(apiUrl(PASSWORD_PATH), () =>
        jsonError(401, 'invalid_credentials', 'Credenciais inválidas'),
      ),
    );

    renderPage(authValue({ logout }));
    await fillForm(user, 'wrong-secret');
    await user.click(screen.getByRole('button', { name: /alterar senha/i }));

    expect(await screen.findByText(/senha atual está incorreta/i)).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });

  it('rejects a confirmation that does not match before calling the API', async () => {
    const user = userEvent.setup();
    const calls = vi.fn();

    server.use(
      http.put(apiUrl(PASSWORD_PATH), () => {
        calls();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderPage();
    await user.type(screen.getByLabelText(/senha atual/i), 'current-secret');
    await user.type(screen.getByLabelText(/^nova senha/i), 'novaSenha123');
    await user.type(screen.getByLabelText(/confirmar nova senha/i), 'outraSenha123');
    await user.click(screen.getByRole('button', { name: /alterar senha/i }));

    expect(await screen.findByText(/confirmação não confere/i)).toBeInTheDocument();
    expect(calls).not.toHaveBeenCalled();
  });
});
