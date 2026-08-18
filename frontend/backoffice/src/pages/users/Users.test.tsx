import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  HttpResponse,
  FRESH_ACCESS_TOKEN,
  ACCESS_EXPIRES_AT,
  apiUrl,
  backofficeOpsUser,
  backofficeUser,
  http,
  jsonError,
  resetSampleUsers,
  sampleUsers,
  server,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import paths from 'routes/paths';
import Users from './Users';

const USERS_PATH = '/api/v1/users';
const OPERATORS_PATH = '/api/v1/platform/operators';

const user = userEvent.setup({ delay: null });

const backofficeAuth: AuthContextValue = {
  user: backofficeUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const backofficeOpsAuth: AuthContextValue = {
  user: backofficeOpsUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const page = (rows: typeof sampleUsers) => ({
  data: rows,
  meta: { page: 1, per_page: 25, total: rows.length },
});

const renderPage = (auth: AuthContextValue = backofficeAuth, initialEntry = paths.users) => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthContext.Provider value={auth}>
        <Users />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

describe('Users page', () => {
  it('lists users with status and membership columns', async () => {
    resetSampleUsers();
    server.use(http.get(apiUrl(USERS_PATH), () => HttpResponse.json(page(sampleUsers))));

    renderPage();

    expect(await screen.findByText('maria@example.com')).toBeInTheDocument();
    expect(screen.getByText('disabled@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('Ativo')).toHaveLength(2);
    expect(screen.getByText('Desativado')).toBeInTheDocument();
    expect(screen.getByText('Colaborador — Escola Alpha')).toBeInTheDocument();
  });

  it('filters users by email search and status', async () => {
    resetSampleUsers();
    const requests: string[] = [];

    server.use(
      http.get(apiUrl(USERS_PATH), ({ request }) => {
        requests.push(request.url);
        const url = new URL(request.url);
        const q = url.searchParams.get('q')?.toLowerCase();
        const status = url.searchParams.get('status');

        let rows = [...sampleUsers];

        if (q) {
          rows = rows.filter((row) => row.email.toLowerCase().includes(q));
        }

        if (status) {
          rows = rows.filter((row) => row.status === status);
        }

        return HttpResponse.json(page(rows));
      }),
    );

    renderPage();

    await screen.findByText('maria@example.com');

    const search = screen.getByLabelText(/buscar usuários por e-mail/i);
    await user.type(search, 'disabled');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(requests.some((url) => url.includes('q=disabled'))).toBe(true);
    });

    expect(await screen.findByText('disabled@example.com')).toBeInTheDocument();
    expect(screen.queryByText('maria@example.com')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/situação/i));
    await user.click(screen.getByRole('option', { name: 'Desativado' }));

    await waitFor(() => {
      expect(requests.some((url) => url.includes('status=disabled'))).toBe(true);
    });
  });

  it('disables an active user after confirmation', async () => {
    resetSampleUsers();
    const disableCalls: string[] = [];

    server.use(
      http.get(apiUrl(USERS_PATH), () => HttpResponse.json(page(sampleUsers))),
      http.post(apiUrl('/api/v1/users/:id/disable'), ({ params }) => {
        disableCalls.push(String(params.id));
        const target = sampleUsers.find((row) => row.id === Number(params.id));
        if (target) {
          target.status = 'disabled';
        }
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderPage();

    await screen.findByText('maria@example.com');

    await user.click(screen.getByRole('button', { name: /desativar maria@example.com/i }));
    await user.click(screen.getByRole('button', { name: /^desativar$/i }));

    await waitFor(() => {
      expect(disableCalls).toEqual(['1']);
    });
  });

  it('enables a disabled user after confirmation', async () => {
    resetSampleUsers();
    const enableCalls: string[] = [];

    server.use(
      http.get(apiUrl(USERS_PATH), () => HttpResponse.json(page(sampleUsers))),
      http.post(apiUrl('/api/v1/users/:id/enable'), ({ params }) => {
        enableCalls.push(String(params.id));
        const target = sampleUsers.find((row) => row.id === Number(params.id));
        if (target) {
          target.status = 'active';
        }
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderPage();

    await screen.findByText('disabled@example.com');

    await user.click(screen.getByRole('button', { name: /reativar disabled@example.com/i }));
    await user.click(screen.getByRole('button', { name: /^reativar$/i }));

    await waitFor(() => {
      expect(enableCalls).toEqual(['2']);
    });
  });

  it('does not offer disable for the signed-in backoffice user', async () => {
    resetSampleUsers();
    server.use(http.get(apiUrl(USERS_PATH), () => HttpResponse.json(page(sampleUsers))));

    renderPage();

    await screen.findByText(backofficeUser.email);
    expect(
      screen.queryByRole('button', { name: new RegExp(`desativar ${backofficeUser.email}`, 'i') }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Você')).toBeInTheDocument();
  });

  it('shows forbidden empty state for non-backoffice users', async () => {
    server.use(
      http.get(apiUrl(USERS_PATH), () =>
        jsonError(403, 'forbidden', 'Você não tem permissão para esta ação.'),
      ),
    );

    renderPage();

    expect(await screen.findByText(/sem acesso a esta área/i)).toBeInTheDocument();
  });

  it('hides the Operators tab without manage_backoffice_ops', async () => {
    resetSampleUsers();
    server.use(http.get(apiUrl(USERS_PATH), () => HttpResponse.json(page(sampleUsers))));

    renderPage();

    await screen.findByText('maria@example.com');
    expect(screen.queryByRole('tab', { name: /operadores/i })).not.toBeInTheDocument();
  });

  it('shows the Operators tab with manage_backoffice_ops', async () => {
    resetSampleUsers();
    server.use(http.get(apiUrl(USERS_PATH), () => HttpResponse.json(page(sampleUsers))));

    renderPage(backofficeOpsAuth);

    await screen.findByText('maria@example.com');
    expect(screen.getByRole('tab', { name: /operadores/i })).toBeInTheDocument();
  });

  it('lists operators with platform permissions on the Operators tab', async () => {
    renderPage(backofficeOpsAuth);

    await screen.findByText('maria@example.com');
    await user.click(screen.getByRole('tab', { name: /operadores/i }));

    expect(await screen.findByText('ops@example.com')).toBeInTheDocument();
    expect(screen.getByText('backoffice@example.com')).toBeInTheDocument();
    expect(screen.getByText(/manage_backoffice_ops, provision_school/i)).toBeInTheDocument();
    expect(screen.getByText('provision_school')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /desativar maria@example.com/i }),
    ).not.toBeInTheDocument();
  });

  it('keeps the Users tab available when operators listing returns 403', async () => {
    resetSampleUsers();
    server.use(
      http.get(apiUrl(USERS_PATH), () => HttpResponse.json(page(sampleUsers))),
      http.get(apiUrl(OPERATORS_PATH), () =>
        jsonError(403, 'forbidden', 'Você não tem permissão para esta ação.'),
      ),
    );

    renderPage(backofficeOpsAuth, `${paths.users}?tab=operators`);

    expect(await screen.findByRole('tab', { name: /usuários/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /operadores/i })).toBeInTheDocument();
    expect(await screen.findByText(/você não tem permissão para esta ação/i)).toBeInTheDocument();
    expect(screen.queryByText(/sem acesso a esta área/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /usuários/i }));

    expect(await screen.findByText('maria@example.com')).toBeInTheDocument();
    expect(screen.queryByText(/você não tem permissão para esta ação/i)).not.toBeInTheDocument();
  });
});
