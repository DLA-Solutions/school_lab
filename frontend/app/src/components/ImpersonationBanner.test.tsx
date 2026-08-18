import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import ImpersonationBanner from 'components/ImpersonationBanner';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { renderWithTheme } from 'test/renderWithTheme';
import { staffUser } from 'test/msw';

const impersonatingUser = {
  ...staffUser,
  impersonation: {
    active: true,
    operator_email: 'ops@example.com',
    school_name: 'Example School — Downtown',
    session_id: 1,
    expires_at: '2026-08-18T20:00:00Z',
  },
};

const authWithImpersonation: AuthContextValue = {
  user: impersonatingUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const authWithoutImpersonation: AuthContextValue = {
  user: staffUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

describe('ImpersonationBanner', () => {
  it('shows support banner when GET /me includes active impersonation', () => {
    renderWithTheme(
      <AuthContext.Provider value={authWithImpersonation}>
        <ImpersonationBanner />
      </AuthContext.Provider>,
    );

    expect(screen.getByTestId('impersonation-banner')).toBeInTheDocument();
    expect(screen.getByText(/modo suporte dla/i)).toBeInTheDocument();
    expect(screen.getByText(/ops@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/example school — downtown/i)).toBeInTheDocument();
  });

  it('renders nothing when impersonation is inactive', () => {
    renderWithTheme(
      <AuthContext.Provider value={authWithoutImpersonation}>
        <ImpersonationBanner />
      </AuthContext.Provider>,
    );

    expect(screen.queryByTestId('impersonation-banner')).not.toBeInTheDocument();
  });

  it('does not expose a dismiss control', () => {
    renderWithTheme(
      <AuthContext.Provider value={authWithImpersonation}>
        <ImpersonationBanner />
      </AuthContext.Provider>,
    );

    expect(screen.queryByRole('button', { name: /fechar|close|dismiss/i })).not.toBeInTheDocument();
  });
});
