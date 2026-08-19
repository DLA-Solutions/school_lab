import { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import {
  ACCESS_EXPIRES_AT,
  FRESH_ACCESS_TOKEN,
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  http,
  server,
  staffMembership,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser, Membership } from 'types/auth';
import Charges from 'pages/billing/Charges';
import Plans from 'pages/billing/Plans';
import PlatformSubscriptionPage from './PlatformSubscription';

const billingMembership: Membership = {
  ...staffMembership,
  permissions: ['manage_billing', 'manage_people'],
  permission_sources: {
    manage_billing: 'template',
    manage_people: 'template',
  },
};

const settingsMembership: Membership = {
  ...staffMembership,
  permissions: ['manage_school_settings'],
  permission_sources: { manage_school_settings: 'owner' },
};

const authFor = (membership: Membership): AuthContextValue => ({
  user: {
    id: 1,
    email: membership.email ?? 'director@example.com',
    status: 'active',
    memberships: [membership],
    guardian_profiles: [],
  } satisfies AuthUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
});

const renderScreen = (ui: ReactElement, membership: Membership) => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter>
      <AuthContext.Provider value={authFor(membership)}>{ui}</AuthContext.Provider>
    </MemoryRouter>,
    { memberships: [membership] },
  );
};

describe('tuition vs platform subscription isolation', () => {
  it('keeps tuition boletos copy off the School Lab subscription screen', async () => {
    renderScreen(<PlatformSubscriptionPage />, settingsMembership);

    expect(await screen.findByText('Assinatura School Lab')).toBeInTheDocument();
    expect(screen.queryByText(/boleto da mensalidade/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/buscar boletos/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^boletos$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^planos$/i })).not.toBeInTheDocument();
  });

  it('keeps School Lab subscription copy off tuition boletos', async () => {
    server.use(
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/billing/charges`), () =>
        HttpResponse.json({
          data: [],
          meta: { page: 1, per_page: 25, total: 0 },
        }),
      ),
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/people/guardians`), () =>
        HttpResponse.json({ data: [], meta: { page: 1, per_page: 25, total: 0 } }),
      ),
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/billing/contracts`), () =>
        HttpResponse.json({ data: [], meta: { page: 1, per_page: 25, total: 0 } }),
      ),
    );

    renderScreen(<Charges />, billingMembership);

    expect(await screen.findByRole('heading', { name: /^boletos$/i })).toBeInTheDocument();
    expect(screen.queryByText(/assinatura school lab/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/faturas da assinatura/i)).not.toBeInTheDocument();
  });

  it('keeps School Lab subscription copy off tuition plans', async () => {
    server.use(
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/billing/plans`), () =>
        HttpResponse.json({ data: [] }),
      ),
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/billing/plan_discounts`), () =>
        HttpResponse.json({ data: [] }),
      ),
    );

    renderScreen(<Plans />, billingMembership);

    expect(await screen.findAllByRole('heading', { name: /^planos$/i })).not.toHaveLength(0);
    expect(screen.queryByText(/assinatura school lab/i)).not.toBeInTheDocument();
  });
});
