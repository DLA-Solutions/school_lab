import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import { JobPosition } from 'types/academics';
import JobPositions from './JobPositions';

const PATH = `/api/v1/schools/${SCHOOL_ID}/academics/job_positions`;

const user = userEvent.setup({ delay: null });

const position = (id: number, name: string, holders = 0): JobPosition => ({
  id,
  school_id: SCHOOL_ID,
  name,
  in_use: holders > 0,
  collaborator_count: holders,
});

const teacher = position(1, 'Professor(a)', 3);
const janitor = position(2, 'Auxiliar de Serviços Gerais');

const staffUser: AuthUser = {
  id: 1,
  email: 'admin@example.com',
  status: 'active',
  memberships: [staffMembership],
  guardian_profiles: [],
};

const authValue: AuthContextValue = {
  user: staffUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const renderPage = () =>
  renderWithTheme(
    <AuthContext.Provider value={authValue}>
      <JobPositions />
    </AuthContext.Provider>,
  );

const page = (rows: JobPosition[]) => ({
  data: rows,
  meta: { page: 1, per_page: 25, total: rows.length },
});

const authenticate = () => setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

describe('JobPositions page', () => {
  it('lists each post with how many collaborators hold it', async () => {
    authenticate();
    server.use(http.get(apiUrl(PATH), () => HttpResponse.json(page([teacher, janitor]))));

    renderPage();

    expect(await screen.findByText('Professor(a)')).toBeInTheDocument();
    expect(screen.getByText('3 colaboradores')).toBeInTheDocument();
    expect(screen.getByText('Ninguém')).toBeInTheDocument();
  });

  it('creates a post', async () => {
    authenticate();

    let received: unknown;
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json(page([janitor]))),
      http.post(apiUrl(PATH), async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ data: position(3, 'Bibliotecária') }, { status: 201 });
      }),
    );

    renderPage();
    await screen.findByText('Auxiliar de Serviços Gerais');

    await user.click(screen.getByRole('button', { name: /novo cargo/i }));
    await user.type(await screen.findByLabelText(/nome do cargo/i), 'Bibliotecária');
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(received).toEqual({ job_position: { name: 'Bibliotecária' } }));
  });

  it('shows a duplicate name from the API under the field', async () => {
    authenticate();
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json(page([janitor]))),
      http.post(apiUrl(PATH), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Dados inválidos.',
              details: { name: ['já está em uso'] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    renderPage();
    await screen.findByText('Auxiliar de Serviços Gerais');

    await user.click(screen.getByRole('button', { name: /novo cargo/i }));
    await user.type(await screen.findByLabelText(/nome do cargo/i), 'Secretária');
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText('já está em uso')).toBeInTheDocument();
  });

  // A collaborator must hold a post, so one still in use cannot be removed.
  it('disables removal for a post someone holds', async () => {
    authenticate();
    server.use(http.get(apiUrl(PATH), () => HttpResponse.json(page([teacher, janitor]))));

    renderPage();
    await screen.findByText('Professor(a)');

    expect(screen.getByRole('button', { name: /excluir professor\(a\)/i })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /excluir auxiliar de serviços gerais/i }),
    ).toBeEnabled();
  });

  it('creates the standard set when the register is empty', async () => {
    authenticate();

    let provisioned = false;
    server.use(
      http.get(apiUrl(PATH), () =>
        HttpResponse.json(page(provisioned ? [teacher, janitor] : [])),
      ),
      http.post(apiUrl(`${PATH}/provision_defaults`), () => {
        provisioned = true;
        return HttpResponse.json({ data: [teacher, janitor] }, { status: 201 });
      }),
    );

    renderPage();

    await user.click(await screen.findByRole('button', { name: /criar cargos padrão/i }));

    expect(await screen.findByText('Professor(a)')).toBeInTheDocument();
    expect(provisioned).toBe(true);
  });

  it('reports the API refusal when a post is still held', async () => {
    authenticate();
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json(page([janitor]))),
      http.delete(apiUrl(`${PATH}/${janitor.id}`), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Dados inválidos.',
              details: { base: ['Este cargo está em uso por 2 colaborador(es).'] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    renderPage();
    await screen.findByText('Auxiliar de Serviços Gerais');

    await user.click(screen.getByRole('button', { name: /excluir auxiliar de serviços gerais/i }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /excluir/i }));

    expect(await screen.findByText(/em uso por 2 colaborador/i)).toBeInTheDocument();
  });
});
