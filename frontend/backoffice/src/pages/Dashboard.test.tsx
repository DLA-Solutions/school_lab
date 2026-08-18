import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import {
  HttpResponse,
  FRESH_ACCESS_TOKEN,
  ACCESS_EXPIRES_AT,
  apiUrl,
  backofficeUser,
  bankCredentialsBySchool,
  http,
  jsonError,
  sampleBankCredential,
  sampleSchools,
  server,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import paths from 'routes/paths';
import Dashboard from './Dashboard';

const SCHOOLS_PATH = '/api/v1/schools';
const OPS_PATH = '/api/v1/platform/operational_summary';

const backofficeAuth: AuthContextValue = {
  user: backofficeUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const renderPage = (auth: AuthContextValue = backofficeAuth) => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter initialEntries={[paths.dashboard]}>
      <AuthContext.Provider value={auth}>
        <Dashboard />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

describe('Dashboard page', () => {
  beforeEach(() => {
    Object.keys(bankCredentialsBySchool).forEach((key) => {
      delete bankCredentialsBySchool[Number(key)];
    });
  });

  it('shows onboarding status counts from the schools list API', async () => {
    server.use(
      http.get(apiUrl(SCHOOLS_PATH), ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get('onboarding_status');
        const rows = status
          ? sampleSchools.filter((school) => school.onboarding_status === status)
          : sampleSchools;

        return HttpResponse.json({
          data: rows.slice(0, 1),
          meta: { page: 1, per_page: 25, total: rows.length },
        });
      }),
    );

    renderPage();

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByLabelText(/em provisionamento: 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/aguardando repasse: 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ativa: 1/i)).toBeInTheDocument();
  });

  it('shows operational alert widgets from platform summary API', async () => {
    renderPage();

    expect(await screen.findByText(/alertas operacionais/i)).toBeInTheDocument();
    expect(screen.getByText(/credenciais expirando/i)).toBeInTheDocument();
    expect(screen.getByText('Escola Alpha')).toBeInTheDocument();
    expect(screen.getByText(/14 dias restantes/i)).toBeInTheDocument();
    expect(screen.getByText(/módulos desativados/i)).toBeInTheDocument();
    expect(screen.getByText('Escola Gama')).toBeInTheDocument();
    expect(screen.getByText(/provisionamento parado/i)).toBeInTheDocument();
  });

  it('links expiring credential rows to bank credentials page', async () => {
    renderPage();

    const credentialsLink = await screen.findByRole('link', { name: /ver credenciais/i });
    expect(credentialsLink).toHaveAttribute('href', paths.bankCredentials(1));
  });

  it('links disabled module rows to school detail page', async () => {
    renderPage();

    const detailLink = await screen.findByRole('link', { name: /ver detalhe/i });
    expect(detailLink).toHaveAttribute('href', paths.schoolDetail(3));
  });

  it('falls back to composed alerts when operational summary is unavailable', async () => {
    server.use(
      http.get(apiUrl(OPS_PATH), () => jsonError(404, 'not_found', 'Recurso não encontrado.')),
    );

    bankCredentialsBySchool[1] = [
      {
        ...sampleBankCredential(1, 'client-expiring'),
        certificate_expires_at: '2026-09-01T12:00:00Z',
      },
    ];

    renderPage();

    expect(await screen.findByText('Escola Alpha')).toBeInTheDocument();
    expect(screen.getByText(/14 dias restantes/i)).toBeInTheDocument();
    expect(screen.getByText('Escola Gama')).toBeInTheDocument();
  });

  it('links to the schools register filtered by onboarding status', async () => {
    server.use(
      http.get(apiUrl(SCHOOLS_PATH), ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get('onboarding_status');
        const rows = status
          ? sampleSchools.filter((school) => school.onboarding_status === status)
          : sampleSchools;

        return HttpResponse.json({
          data: rows,
          meta: { page: 1, per_page: 25, total: rows.length },
        });
      }),
    );

    renderPage();

    const provisioningLink = await screen.findByRole('link', {
      name: /ver em provisionamento/i,
    });
    expect(provisioningLink).toHaveAttribute(
      'href',
      paths.schoolsWithOnboardingStatus('provisioning'),
    );

    const handoffLink = screen.getByRole('link', { name: /ver aguardando repasse/i });
    expect(handoffLink).toHaveAttribute(
      'href',
      paths.schoolsWithOnboardingStatus('pending_handoff'),
    );
  });

  it('shows no-access state when the schools API returns forbidden', async () => {
    server.use(
      http.get(apiUrl(SCHOOLS_PATH), () =>
        jsonError(403, 'forbidden', 'Acesso negado.'),
      ),
    );

    renderPage();

    expect(await screen.findByText('Sem acesso a esta área')).toBeInTheDocument();
  });

  it('shows empty operational widgets when summary has no alerts', async () => {
    server.use(
      http.get(apiUrl(OPS_PATH), () =>
        HttpResponse.json({
          data: {
            credentials_expiring: [],
            schools_with_disabled_modules: [],
            provisioning_backlog_count: 0,
          },
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText(/nenhuma credencial expira nos próximos 30 dias/i)).toBeInTheDocument();
    expect(screen.getByText(/todas as escolas têm os quatro módulos ativos/i)).toBeInTheDocument();
    expect(screen.getByText(/nenhuma escola em provisionamento há mais de 14 dias/i)).toBeInTheDocument();
  });

  it('disables quick links when the count is zero', async () => {
    server.use(
      http.get(apiUrl(SCHOOLS_PATH), ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get('onboarding_status');

        return HttpResponse.json({
          data: [],
          meta: { page: 1, per_page: 25, total: status === 'provisioning' ? 0 : 1 },
        });
      }),
    );

    renderPage();

    const provisioningLink = await screen.findByRole('link', {
      name: /ver em provisionamento/i,
    });

    await waitFor(() => {
      expect(provisioningLink).toHaveAttribute('aria-disabled', 'true');
    });
  });
});
