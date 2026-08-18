import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import {
  HttpResponse,
  FRESH_ACCESS_TOKEN,
  ACCESS_EXPIRES_AT,
  apiUrl,
  backofficeUser,
  http,
  jsonError,
  sampleAudits,
  server,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import paths from 'routes/paths';
import Audits from './Audits';

const AUDITS_PATH = '/api/v1/platform/audits';

const backofficeAuth: AuthContextValue = {
  user: backofficeUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const page = (rows: typeof sampleAudits) => ({
  data: rows,
  meta: { page: 1, per_page: 25, total: rows.length },
});

const renderPage = (initialEntry: string = paths.audits) => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthContext.Provider value={backofficeAuth}>
        <Audits />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

describe('Audits page', () => {
  it('lists audit rows newest-first from the API', async () => {
    server.use(http.get(apiUrl(AUDITS_PATH), () => HttpResponse.json(page(sampleAudits))));

    renderPage();

    expect(await screen.findByText('SchoolModule')).toBeInTheDocument();
    expect(screen.getByText('SchoolYear')).toBeInTheDocument();
    expect(screen.getByText('billing')).toBeInTheDocument();
  });

  it('filters audits by action and syncs URL params', async () => {
    const requests: string[] = [];

    server.use(
      http.get(apiUrl(AUDITS_PATH), ({ request }) => {
        requests.push(request.url);
        const url = new URL(request.url);
        const action = url.searchParams.get('action');
        const rows = action ? sampleAudits.filter((row) => row.action === action) : sampleAudits;

        return HttpResponse.json(page(rows));
      }),
    );

    renderPage(`${paths.audits}?action=update&date_from=2026-01-01`);

    await waitFor(() => {
      expect(requests.some((url) => url.includes('action=update'))).toBe(true);
      expect(requests.some((url) => url.includes('date_from=2026-01-01'))).toBe(true);
    });
  });

  it('does not show export controls', async () => {
    server.use(http.get(apiUrl(AUDITS_PATH), () => HttpResponse.json(page(sampleAudits))));

    renderPage();

    await screen.findByText('SchoolModule');

    expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument();
  });

  it('shows forbidden empty state for non-backoffice users', async () => {
    server.use(
      http.get(apiUrl(AUDITS_PATH), () =>
        jsonError(403, 'backoffice_only', 'Você não tem permissão para esta ação.'),
      ),
    );

    renderPage();

    expect(await screen.findByText(/sem acesso a esta área/i)).toBeInTheDocument();
  });
});
