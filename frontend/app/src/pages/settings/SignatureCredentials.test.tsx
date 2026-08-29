import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import SignatureCredentials from './SignatureCredentials';

const ENDPOINT = `/api/v1/schools/${SCHOOL_ID}/signature_credentials`;

const user = userEvent.setup({ delay: null });

const registration = (overrides: Record<string, unknown> = {}) => ({
  id: 42,
  school_id: SCHOOL_ID,
  provider: 'autentique',
  active: true,
  uploaded_at: '2026-08-10T12:00:00Z',
  uploaded_by_id: 1,
  webhook_path: '/webhooks/signatures/tok-abc',
  webhook_secret_set: true,
  ...overrides,
});

const ownerUser: AuthUser = {
  id: 1,
  email: 'owner@example.com',
  status: 'active',
  memberships: [{ ...staffMembership, is_owner: true }],
  guardian_profiles: [],
};

const authValue: AuthContextValue = {
  user: ownerUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const renderPage = () => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <SignatureCredentials />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

describe('Signature credentials page', () => {
  it('says a school with no token cannot send contracts for signature', async () => {
    server.use(http.get(apiUrl(ENDPOINT), () => HttpResponse.json({ data: [] })));

    renderPage();

    expect(await screen.findByText(/ainda não tem token da autentique/i)).toBeInTheDocument();
  });

  // The token is stored encrypted and never returned, so the screen can only show that one is
  // registered — and replacing is offered anyway, because that is how a rotation is done.
  it('shows the registration and still offers to replace the token', async () => {
    server.use(http.get(apiUrl(ENDPOINT), () => HttpResponse.json({ data: [registration()] })));

    renderPage();

    expect(await screen.findByText('/webhooks/signatures/tok-abc')).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.getByText(/substituir token/i)).toBeInTheDocument();
  });

  // Without a secret every callback answers 401 and the school never learns that a family signed.
  it('warns when there is no webhook secret to verify callbacks against', async () => {
    server.use(
      http.get(apiUrl(ENDPOINT), () =>
        HttpResponse.json({ data: [registration({ webhook_secret_set: false })] }),
      ),
    );

    renderPage();

    expect(await screen.findByText(/recusados com 401/i)).toBeInTheDocument();
  });

  it('registers the token and shows the webhook secret the once', async () => {
    const sent: Record<string, unknown>[] = [];
    server.use(
      http.get(apiUrl(ENDPOINT), () => HttpResponse.json({ data: [] })),
      http.post(apiUrl(ENDPOINT), async ({ request }) => {
        sent.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { data: { ...registration(), webhook_secret: 'sec-xyz' } },
          { status: 201 },
        );
      }),
    );

    renderPage();

    const field = await screen.findByLabelText(/token da api da autentique/i);
    await user.type(field, 'live-token');
    await user.click(screen.getByRole('button', { name: /registrar token/i }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ provider: 'autentique', api_token: 'live-token' });

    expect(await screen.findByText(/token registrado com sucesso/i)).toBeInTheDocument();
    expect(screen.getByText(/sec-xyz/)).toBeInTheDocument();
    // A live credential has no reason to sit in an input on a screen someone may walk away from.
    expect(field).toHaveValue('');
  });

  // It can create documents in the school's name, so it is not left readable over a shoulder.
  it('masks the token as it is typed', async () => {
    server.use(http.get(apiUrl(ENDPOINT), () => HttpResponse.json({ data: [] })));

    renderPage();

    expect(await screen.findByLabelText(/token da api da autentique/i)).toHaveAttribute(
      'type',
      'password',
    );
  });
});
