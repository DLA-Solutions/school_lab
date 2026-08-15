import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import { Guardian } from 'types/guardian';
import Guardians from './Guardians';

const GUARDIANS_PATH = `/api/v1/schools/${SCHOOL_ID}/people/guardians`;

const user = userEvent.setup({ delay: null });

const guardian = (id: number, name: string, cpf: string): Guardian => ({
  id,
  school_id: SCHOOL_ID,
  user_id: null,
  active: true,
  name,
  cpf,
  email: `${id}@example.com`,
  phone: '+55 11 99999-0000',
  zip_code: '01310100',
  street: 'Avenida Paulista',
  number: '1000',
  complement: null,
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
});

const maria = guardian(1, 'Maria Silva', '12345678909');
const joao = guardian(2, 'João Souza', '52998224725');

/** `useCurrentSchool` reads the staff membership off the signed-in user. */
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

// The listing keeps its term in the URL, so it needs a router around it.
const renderPage = () =>
  renderWithTheme(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <Guardians />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

/** Records the `q` of every listing request, in order. */
const recordQueries = () => {
  const seen: (string | null)[] = [];

  server.use(
    http.get(apiUrl(GUARDIANS_PATH), ({ request }) => {
      const url = new URL(request.url);
      const term = url.searchParams.get('q');
      seen.push(term);

      // Stands in for `PersonSearchable`: name OR CPF, and the CPF only when the term has
      // digits — `"".includes("")` is true, which would match every row.
      const digits = term?.replace(/\D/g, '') ?? '';
      const rows = term
        ? [maria, joao].filter(
            (row) =>
              row.name.toLowerCase().includes(term.toLowerCase()) ||
              (digits !== '' && row.cpf.includes(digits)),
          )
        : [maria, joao];

      return HttpResponse.json({
        data: rows,
        meta: { page: Number(url.searchParams.get('page') ?? 1), per_page: 25, total: rows.length },
      });
    }),
  );

  return seen;
};

describe('Guardians page search', () => {
  it('lists everyone with no term', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');
    const queries = recordQueries();

    renderPage();

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('João Souza')).toBeInTheDocument();
    // No `q` at all rather than an empty one — the API treats a blank term as "everything".
    expect(queries).toEqual([null]);
  });

  it('sends the typed term and shows only what matches', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');
    const queries = recordQueries();

    renderPage();
    await screen.findByText('Maria Silva');

    await user.type(screen.getByRole('textbox', { name: /buscar responsáveis/i }), 'Silva');

    await waitFor(() => expect(queries).toContain('Silva'));
    await waitFor(() => expect(screen.queryByText('João Souza')).not.toBeInTheDocument());
    // Awaited rather than read synchronously: the grid re-renders its rows asynchronously, so a
    // plain `getByText` here races the refresh under load.
    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
  });

  // The CPF is stored as digits; the search box has to accept it punctuated all the same.
  it('searches by a formatted CPF', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');
    const queries = recordQueries();

    renderPage();
    await screen.findByText('Maria Silva');

    await user.type(
      screen.getByRole('textbox', { name: /buscar responsáveis/i }),
      '529.982.247-25',
    );

    await waitFor(() => expect(queries).toContain('529.982.247-25'));
    expect(await screen.findByText('João Souza')).toBeInTheDocument();
  });

  // Typing must not fire a request per keystroke.
  it('waits for the typing to settle before refetching', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');
    const queries = recordQueries();

    renderPage();
    await screen.findByText('Maria Silva');

    await user.type(screen.getByRole('textbox', { name: /buscar responsáveis/i }), 'Silva');
    await waitFor(() => expect(queries).toContain('Silva'));

    // One request for the initial load and one for the settled term — not one per letter.
    expect(queries).toEqual([null, 'Silva']);
  });

  it('says nothing was found instead of claiming the register is empty', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');
    recordQueries();

    renderPage();
    await screen.findByText('Maria Silva');

    await user.type(screen.getByRole('textbox', { name: /buscar responsáveis/i }), 'Ninguém');

    expect(await screen.findByText(/nenhum resultado/i)).toBeInTheDocument();
    expect(screen.getByText(/nada encontrado para "Ninguém"/i)).toBeInTheDocument();
  });
});

// Gives the family a way in: an invitation if they have never set a password, a reset if they have.
// The API answers the same either way, so the screen only promises that a link was sent.
describe('Guardians page access', () => {
  it('sends system access to a guardian', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');
    recordQueries();

    let called = 0;
    server.use(
      http.post(apiUrl(`${GUARDIANS_PATH}/:id/access`), () => {
        called += 1;
        return HttpResponse.json({ data: maria });
      }),
    );

    renderPage();
    await screen.findByText('Maria Silva');

    await user.click(
      screen.getByRole('button', { name: /enviar acesso ao sistema para maria silva/i }),
    );

    await waitFor(() => expect(called).toBe(1));
    expect(await screen.findByText(/enviamos o link de acesso/i)).toBeInTheDocument();
  });
});

describe('Guardians page row actions', () => {
  // All five have to be reachable on an active row. They were never removed — the actions column
  // was still sized for four, so the two on the left were clipped out of the cell.
  it('offers every action on an active guardian', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');
    recordQueries();

    renderPage();
    await screen.findByText('Maria Silva');

    const actions = [
      /enviar acesso ao sistema para maria silva/i,
      /contratos maria silva/i,
      /documentos pessoais maria silva/i,
      /editar maria silva/i,
      /excluir maria silva/i,
    ];

    actions.forEach((name) => {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    });
  });
});

