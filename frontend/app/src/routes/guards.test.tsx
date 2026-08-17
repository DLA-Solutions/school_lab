import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { renderWithTheme } from 'test/renderWithTheme';
import { activeMembershipValueFor } from 'test/activeMembership';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { ActiveMembershipContext } from 'providers/ActiveMembershipContext';
import { guardianMembership, staffMembership, staffUser } from 'test/msw';
import paths from './paths';
import { RequireRouteAudience, RequireRouteModule } from './guards';

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

const renderGuardedRoute = (
  initialPath: string,
  auth: AuthContextValue = billingStaffAuth,
  membershipId?: number,
) => {
  const membership = auth.user!.memberships[0];

  return renderWithTheme(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthContext.Provider value={auth}>
        <ActiveMembershipContext.Provider
          value={activeMembershipValueFor(auth.user!.memberships, membershipId ?? membership.id)}
        >
          <Routes>
            <Route
              path={paths.charges}
              element={
                <RequireRouteModule>
                  <RequireRouteAudience>
                    <div>Billing page</div>
                  </RequireRouteAudience>
                </RequireRouteModule>
              }
            />
            <Route
              path={paths.collaborators}
              element={
                <RequireRouteAudience>
                  <div>Collaborators page</div>
                </RequireRouteAudience>
              }
            />
            <Route
              path={paths.myPreceptorship}
              element={
                <RequireRouteAudience>
                  <div>My preceptorship page</div>
                </RequireRouteAudience>
              }
            />
            <Route
              path={paths.myReportCards}
              element={
                <RequireRouteAudience>
                  <div>My report cards page</div>
                </RequireRouteAudience>
              }
            />
            <Route
              path={paths.myTaxDeclarations}
              element={
                <RequireRouteModule>
                  <RequireRouteAudience>
                    <div>My tax declarations page</div>
                  </RequireRouteAudience>
                </RequireRouteModule>
              }
            />
            <Route
              path={paths.myCharges}
              element={
                <RequireRouteModule>
                  <RequireRouteAudience>
                    <div>My charges page</div>
                  </RequireRouteAudience>
                </RequireRouteModule>
              }
            />
            <Route path={paths.dashboard} element={<div>Dashboard</div>} />
          </Routes>
        </ActiveMembershipContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

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

describe('RequireRouteAudience', () => {
  it('redirects a guardian deep-linking to a staff route', () => {
    const auth: AuthContextValue = {
      ...billingStaffAuth,
      user: {
        id: 1,
        email: guardianMembership.email ?? 'guardian@example.com',
        status: 'active',
        memberships: [guardianMembership],
        guardian_profiles: [],
      },
    };

    renderGuardedRoute(paths.collaborators, auth, guardianMembership.id);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Collaborators page')).not.toBeInTheDocument();
  });

  it('redirects staff deep-linking to a guardian route', () => {
    renderGuardedRoute(paths.myPreceptorship);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('My preceptorship page')).not.toBeInTheDocument();
  });

  it('allows a guardian to open guardian routes', () => {
    const auth: AuthContextValue = {
      ...billingStaffAuth,
      user: {
        id: 1,
        email: guardianMembership.email ?? 'guardian@example.com',
        status: 'active',
        memberships: [guardianMembership],
        guardian_profiles: [],
      },
    };

    renderGuardedRoute(paths.myPreceptorship, auth, guardianMembership.id);

    expect(screen.getByText('My preceptorship page')).toBeInTheDocument();
  });

  it('allows a guardian to open report cards route', () => {
    const auth: AuthContextValue = {
      ...billingStaffAuth,
      user: {
        id: 1,
        email: guardianMembership.email ?? 'guardian@example.com',
        status: 'active',
        memberships: [guardianMembership],
        guardian_profiles: [],
      },
    };

    renderGuardedRoute(paths.myReportCards, auth, guardianMembership.id);

    expect(screen.getByText('My report cards page')).toBeInTheDocument();
  });

  it('redirects a guardian when billing module is disabled on tax declarations route', () => {
    const auth: AuthContextValue = {
      ...billingStaffAuth,
      user: {
        id: 1,
        email: guardianMembership.email ?? 'guardian@example.com',
        status: 'active',
        memberships: [
          {
            ...guardianMembership,
            enabled_modules: ['communication', 'academic', 'documents'],
          },
        ],
        guardian_profiles: [],
      },
    };

    renderGuardedRoute(paths.myTaxDeclarations, auth, guardianMembership.id);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('My tax declarations page')).not.toBeInTheDocument();
  });

  it('allows a guardian to open tax declarations when billing module is enabled', () => {
    const auth: AuthContextValue = {
      ...billingStaffAuth,
      user: {
        id: 1,
        email: guardianMembership.email ?? 'guardian@example.com',
        status: 'active',
        memberships: [
          {
            ...guardianMembership,
            enabled_modules: ['communication', 'academic', 'billing', 'documents'],
          },
        ],
        guardian_profiles: [],
      },
    };

    renderGuardedRoute(paths.myTaxDeclarations, auth, guardianMembership.id);

    expect(screen.getByText('My tax declarations page')).toBeInTheDocument();
  });

  it('redirects a guardian when billing module is disabled on my charges route', () => {
    const auth: AuthContextValue = {
      ...billingStaffAuth,
      user: {
        id: 1,
        email: guardianMembership.email ?? 'guardian@example.com',
        status: 'active',
        memberships: [
          {
            ...guardianMembership,
            enabled_modules: ['communication', 'academic', 'documents'],
          },
        ],
        guardian_profiles: [],
      },
    };

    renderGuardedRoute(paths.myCharges, auth, guardianMembership.id);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('My charges page')).not.toBeInTheDocument();
  });

  it('allows a guardian to open my charges when billing module is enabled', () => {
    const auth: AuthContextValue = {
      ...billingStaffAuth,
      user: {
        id: 1,
        email: guardianMembership.email ?? 'guardian@example.com',
        status: 'active',
        memberships: [
          {
            ...guardianMembership,
            enabled_modules: ['communication', 'academic', 'billing', 'documents'],
          },
        ],
        guardian_profiles: [],
      },
    };

    renderGuardedRoute(paths.myCharges, auth, guardianMembership.id);

    expect(screen.getByText('My charges page')).toBeInTheDocument();
  });
});
