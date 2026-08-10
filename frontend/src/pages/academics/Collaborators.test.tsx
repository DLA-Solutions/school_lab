import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import { Teacher } from 'types/academics';
import Collaborators from './Collaborators';

const TEACHERS_PATH = `/api/v1/schools/${SCHOOL_ID}/academics/teachers`;
const DOCUMENTS_PATH = `/api/v1/schools/${SCHOOL_ID}/documents`;
const POSITIONS_PATH = `/api/v1/schools/${SCHOOL_ID}/academics/job_positions`;

const user = userEvent.setup({ delay: null });

const collaborator = (id: number, name: string, jobTitle: string, cpf: string): Teacher => ({
  id,
  school_id: SCHOOL_ID,
  name,
  cpf,
  email: `${id}@example.com`,
  phone: null,
  job_position_id: id,
  job_title: jobTitle,
  hired_on: '2024-02-01',
  classes: [],
});

const carla = collaborator(1, 'Carla Nogueira', 'Professora', '12345678909');
const bruno = collaborator(2, 'Bruno Alves', 'Porteiro', '52998224725');

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
        <Collaborators />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

/** Records the `q` of every listing request and filters like `PersonSearchable` does. */
const stubListing = () => {
  const seen: (string | null)[] = [];

  server.use(
    // The collaborator form is mounted with the page and loads the posts for its "Cargo" select.
    http.get(apiUrl(POSITIONS_PATH), () =>
      HttpResponse.json({
        data: [{ id: 1, school_id: SCHOOL_ID, name: 'Professora', in_use: true, collaborator_count: 1 }],
        meta: { page: 1, per_page: 25, total: 1 },
      }),
    ),
    http.get(apiUrl(TEACHERS_PATH), ({ request }) => {
      const url = new URL(request.url);
      const term = url.searchParams.get('q');
      seen.push(term);

      const digits = term?.replace(/\D/g, '') ?? '';
      const rows = term
        ? [carla, bruno].filter(
            (row) =>
              row.name.toLowerCase().includes(term.toLowerCase()) ||
              (digits !== '' && row.cpf.includes(digits)),
          )
        : [carla, bruno];

      return HttpResponse.json({
        data: rows,
        meta: { page: 1, per_page: 25, total: rows.length },
      });
    }),
  );

  return seen;
};

const authenticate = () => setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

describe('Collaborators page', () => {
  it('shows the post and the hire date of each collaborator', async () => {
    authenticate();
    stubListing();

    renderPage();

    expect(await screen.findByText('Carla Nogueira')).toBeInTheDocument();
    expect(screen.getByText('Professora')).toBeInTheDocument();
    expect(screen.getByText('Porteiro')).toBeInTheDocument();
    // ISO on the wire, formatted on screen.
    expect(screen.getAllByText('01/02/2024')).toHaveLength(2);
  });

  it('searches by name', async () => {
    authenticate();
    const queries = stubListing();

    renderPage();
    await screen.findByText('Carla Nogueira');

    await user.type(screen.getByRole('textbox', { name: /buscar colaboradores/i }), 'Nogueira');

    await waitFor(() => expect(queries).toContain('Nogueira'));
    await waitFor(() => expect(screen.queryByText('Bruno Alves')).not.toBeInTheDocument());
    // Awaited rather than read synchronously: the grid re-renders its rows asynchronously.
    expect(await screen.findByText('Carla Nogueira')).toBeInTheDocument();

    // One request for the initial load and one for the settled term — not one per letter.
    expect(queries).toEqual([null, 'Nogueira']);
  });

  it('opens the personal documents of one collaborator', async () => {
    authenticate();
    stubListing();

    let requestedUrl = '';
    server.use(
      http.get(apiUrl(DOCUMENTS_PATH), ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({ data: [], meta: { page: 1, per_page: 25, total: 0 } });
      }),
    );

    renderPage();
    await screen.findByText('Carla Nogueira');

    await user.click(screen.getByRole('button', { name: /documentos de carla nogueira/i }));

    // The heading names whose file is open, and the list is narrowed to that collaborator.
    expect(await screen.findByText(/documentos pessoais/i)).toBeInTheDocument();
    expect(screen.getByText('Carla Nogueira — Professora')).toBeInTheDocument();

    await waitFor(() => expect(requestedUrl).not.toBe(''));
    const query = new URL(requestedUrl).searchParams;
    expect(query.get('documentable_type')).toBe('Teacher');
    expect(query.get('documentable_id')).toBe(String(carla.id));
  });

  it('offers the document kinds a collaborator is asked for', async () => {
    authenticate();
    stubListing();
    server.use(
      http.get(apiUrl(DOCUMENTS_PATH), () =>
        HttpResponse.json({ data: [], meta: { page: 1, per_page: 25, total: 0 } }),
      ),
    );

    renderPage();
    await screen.findByText('Carla Nogueira');
    await user.click(screen.getByRole('button', { name: /documentos de carla nogueira/i }));

    await user.click(await screen.findByRole('combobox', { name: /tipo de documento/i }));

    expect(screen.getByRole('option', { name: 'Contrato de trabalho' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Diploma / certificação' })).toBeInTheDocument();
    // Proof of income belongs to a guardian's file, not a collaborator's.
    expect(screen.queryByRole('option', { name: 'Comprovante de renda' })).not.toBeInTheDocument();
  });
});
