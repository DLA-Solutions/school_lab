import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { staffMembership, staffUser } from 'test/msw';
import paths from './paths';
import { RequireRouteModule } from './guards';

const billingStaffAuth: AuthContextValue = {
  user: {
    ...staffUser,
    memberships: [
      {
        ...staffMembership,
        permissions: ['manage_billing', 'manage_people'],
        enabled_modules: ['communication', 'academic', 'documents'],
      },
    ],
  },
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const renderGuardedRoute = (initialPath: string, auth: AuthContextValue = billingStaffAuth) =>
  renderWithTheme(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthContext.Provider value={auth}>
        <Routes>
          <Route
            path={paths.charges}
            element={
              <RequireRouteModule>
                <div>Billing page</div>
              </RequireRouteModule>
            }
          />
          <Route path={paths.dashboard} element={<div>Dashboard</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );

describe('RequireRouteModule', () => {
  it('redirects to dashboard when billing module is disabled', () => {
    renderGuardedRoute(paths.charges);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Billing page')).not.toBeInTheDocument();
  });

  it('renders the route when the module is enabled', () => {
    const auth: AuthContextValue = {
      ...billingStaffAuth,
      user: {
        ...billingStaffAuth.user!,
        memberships: [
          {
            ...staffMembership,
            permissions: ['manage_billing'],
            enabled_modules: ['communication', 'academic', 'billing', 'documents'],
          },
        ],
      },
    };

    renderGuardedRoute(paths.charges, auth);

    expect(screen.getByText('Billing page')).toBeInTheDocument();
  });
});
