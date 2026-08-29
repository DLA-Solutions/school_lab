import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import {
  VALID_GOOGLE_ID_TOKEN,
  currentUser,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { ApiError } from 'services/api';
import { setAccessToken } from 'services/tokenStore';
import { ACCESS_EXPIRES_AT, FRESH_ACCESS_TOKEN } from 'test/msw/handlers';
import SignIn from './Signin';

vi.mock('components/auth/GoogleSignInButton', () => ({
  default: ({
    onCredential,
    disabled,
  }: {
    onCredential: (token: string) => void;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled} onClick={() => onCredential(VALID_GOOGLE_ID_TOKEN)}>
      Entrar com Google
    </button>
  ),
}));

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

const renderPage = (auth: AuthContextValue = guestAuth) =>
  renderWithTheme(
    <MemoryRouter initialEntries={['/auth/signin']}>
      <AuthContext.Provider value={auth}>
        <Routes>
          <Route path="/auth/signin" element={<SignIn />} />
          <Route path="/" element={<div>Dashboard</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );

describe('SignIn', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GOOGLE_OAUTH_CLIENT_ID', 'test-client-id.apps.googleusercontent.com');
  });

  it('renders the Google sign-in button when the client ID is configured', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /entrar com google/i })).toBeInTheDocument();
    expect(screen.getByText(/ou continue com/i)).toBeInTheDocument();
  });

  it('signs in with Google and navigates to the dashboard', async () => {
    const loginWithGoogle = vi.fn().mockImplementation(async () => {
      setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
      return currentUser;
    });

    renderPage({ ...guestAuth, loginWithGoogle });

    await user.click(screen.getByRole('button', { name: /entrar com google/i }));

    await waitFor(() => expect(loginWithGoogle).toHaveBeenCalledWith(VALID_GOOGLE_ID_TOKEN, false));
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('shows a friendly message when Google login is denied', async () => {
    const loginWithGoogle = vi
      .fn()
      .mockRejectedValue(new ApiError(403, 'access_denied', 'Acesso negado.', {}));

    renderPage({ ...guestAuth, loginWithGoogle });

    await user.click(screen.getByRole('button', { name: /entrar com google/i }));

    expect(
      await screen.findByText(/você não tem permissão para entrar/i),
    ).toBeInTheDocument();
  });

  it('hides the Google button when the client ID is not configured', () => {
    vi.stubEnv('VITE_GOOGLE_OAUTH_CLIENT_ID', '');
    renderPage();
    expect(screen.queryByRole('button', { name: /entrar com google/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/ou continue com/i)).not.toBeInTheDocument();
  });
});
