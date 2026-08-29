import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import {
  ACCESS_EXPIRES_AT,
  FRESH_ACCESS_TOKEN,
  apiUrl,
  backofficeUser,
  http,
  HttpResponse,
  jsonError,
  server,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import paths from 'routes/paths';
import SignatureCredentials from './SignatureCredentials';

const SCHOOL_ID = 3;
const pagePath = paths.signatureCredentials(SCHOOL_ID);
const endpoint = `/api/v1/schools/${SCHOOL_ID}/signature_credentials`;

const user = userEvent.setup({ delay: null });

const backofficeAuth: AuthContextValue = {
  user: backofficeUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const registration = (overrides: Record<string, unknown> = {}) => ({
  id: 42,
  school_id: SCHOOL_ID,
  provider: 'autentique',
  active: true,
  uploaded_at: '2026-08-10T12:00:00Z',
  uploaded_by_id: backofficeUser.id,
  webhook_path: '/webhooks/signatures/tok-abc',
  webhook_secret_set: true,
  ...overrides,
});

const renderPage = () => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter initialEntries={[pagePath]}>
      <AuthContext.Provider value={backofficeAuth}>
        <Routes>
          <Route
            path="schools/:schoolId/signature-credentials"
            element={<SignatureCredentials />}
          />
          <Route path={paths.schools} element={<div>Escolas</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

describe('SignatureCredentials', () => {
  it('says a school with no token registered cannot send contracts', async () => {
    server.use(http.get(apiUrl(endpoint), () => HttpResponse.json({ data: [] })));

    renderPage();

    expect(await screen.findByText(/ainda não tem token da autentique/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar token/i })).toBeInTheDocument();
  });

  // The token is stored encrypted and never returned, so the screen can only show that one is
  // registered — and re-registering is offered anyway, because that is how a rotation is done.
  it('shows the registration facts and still offers to replace the token', async () => {
    server.use(http.get(apiUrl(endpoint), () => HttpResponse.json({ data: [registration()] })));

    renderPage();

    expect(await screen.findByText('/webhooks/signatures/tok-abc')).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    // The heading says it is a replacement; the button keeps one wording, as on bank credentials.
    expect(screen.getByText(/substituir token/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar token/i })).toBeInTheDocument();
  });

  // Without a secret every callback answers 401 and the school never learns that a family signed.
  it('warns when there is no webhook secret to verify callbacks against', async () => {
    server.use(
      http.get(apiUrl(endpoint), () =>
        HttpResponse.json({ data: [registration({ webhook_secret_set: false })] }),
      ),
    );

    renderPage();

    expect(await screen.findByText(/recusados com 401/i)).toBeInTheDocument();
  });

  it('registers the token and shows the webhook secret the once', async () => {
    const sent: Record<string, unknown>[] = [];
    server.use(
      http.get(apiUrl(endpoint), () => HttpResponse.json({ data: [] })),
      http.post(apiUrl(endpoint), async ({ request }) => {
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

  // Masked rather than readable over someone's shoulder: it can create documents in the school's
  // name.
  it('masks the token as it is typed', async () => {
    server.use(http.get(apiUrl(endpoint), () => HttpResponse.json({ data: [] })));

    renderPage();

    expect(await screen.findByLabelText(/token da api da autentique/i)).toHaveAttribute(
      'type',
      'password',
    );
  });

  it('reports what the API refused rather than a generic failure', async () => {
    server.use(
      http.get(apiUrl(endpoint), () => HttpResponse.json({ data: [] })),
      http.post(apiUrl(endpoint), () =>
        jsonError(422, 'validation_error', 'Dados inválidos.', { api_token: ['blank'] }),
      ),
    );

    renderPage();

    await user.type(await screen.findByLabelText(/token da api da autentique/i), 'x');
    await user.click(screen.getByRole('button', { name: /registrar token/i }));

    expect(await screen.findByText(/token da api: blank/i)).toBeInTheDocument();
  });
});
