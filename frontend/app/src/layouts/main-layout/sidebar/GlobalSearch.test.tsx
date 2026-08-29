import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import userEvent from '@testing-library/user-event';
import {
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  guardianMembership,
  http,
  server,
  staffMembership,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { activeMembershipValueFor } from 'test/activeMembership';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { ActiveMembershipContext } from 'providers/ActiveMembershipContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import GlobalSearch from './GlobalSearch';

const GUARDIANS = `/api/v1/schools/${SCHOOL_ID}/people/guardians`;
const STUDENTS = `/api/v1/schools/${SCHOOL_ID}/people/students`;
const TEACHERS = `/api/v1/schools/${SCHOOL_ID}/academics/teachers`;

const user = userEvent.setup({ delay: null });

const page = <T,>(rows: T[]) => ({
  data: rows,
  meta: { page: 1, per_page: 25, total: rows.length },
});

const maria = { id: 1, name: 'Maria Silva', cpf: '12345678909' };
const pedro = {
  id: 2,
  name: 'Pedro Silva',
  cpf: '52998224725',
  school_class_name: 'A',
};
const carla = { id: 3, name: 'Carla Nogueira', cpf: '15852119075', job_title: 'Professora' };

const membershipFor = (role: string) =>
  role === 'guardian'
    ? { ...guardianMembership, email: 'user@example.com' }
    : { ...staffMembership, role, email: 'user@example.com' };

const userWith = (role: string): AuthUser => ({
  id: 1,
  email: 'user@example.com',
  status: 'active',
  memberships: [membershipFor(role)],
  guardian_profiles: [],
});

const authValueFor = (role: string): AuthContextValue => ({
  user: userWith(role),
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
});

const LocationProbe = () => {
  const location = useLocation();

  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const renderSearch = (role = 'staff') => {
  const membership = membershipFor(role);

  return renderWithTheme(
    <MemoryRouter initialEntries={['/']}>
      <AuthContext.Provider value={authValueFor(role)}>
        <ActiveMembershipContext.Provider
          value={activeMembershipValueFor([membership], membership.id)}
        >
          <GlobalSearch />
          <Routes>
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </ActiveMembershipContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

const stubPeople = () => {
  const seen: string[] = [];

  server.use(
    http.get(apiUrl(GUARDIANS), ({ request }) => {
      seen.push(`guardians:${new URL(request.url).searchParams.get('q')}`);
      return HttpResponse.json(page([maria]));
    }),
    http.get(apiUrl(STUDENTS), ({ request }) => {
      seen.push(`students:${new URL(request.url).searchParams.get('q')}`);
      return HttpResponse.json(page([pedro]));
    }),
    http.get(apiUrl(TEACHERS), ({ request }) => {
      seen.push(`teachers:${new URL(request.url).searchParams.get('q')}`);
      return HttpResponse.json(page([carla]));
    }),
  );

  return seen;
};

const box = () => screen.getByRole('combobox', { name: /buscar/i });

const authenticate = () => setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

describe('GlobalSearch', () => {
  it('finds a page by name and navigates to it', async () => {
    authenticate();
    stubPeople();
    renderSearch();

    await user.type(box(), 'Turmas');

    await user.click(await screen.findByText('Turmas'));

    expect(screen.getByTestId('location')).toHaveTextContent('/academico/aulas');
  });

  it('matches a name without its accents', async () => {
    authenticate();
    stubPeople();
    renderSearch();

    await user.type(box(), 'nogueira');

    expect(await screen.findByText('Carla Nogueira')).toBeInTheDocument();
  });

  it('groups people by register', async () => {
    authenticate();
    stubPeople();
    renderSearch();

    await user.type(box(), 'Silva');

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Pedro Silva')).toBeInTheDocument();
    expect(screen.getByText('Carla Nogueira')).toBeInTheDocument();
    expect(screen.getByText('Responsáveis')).toBeInTheDocument();
    expect(screen.getByText('Estudantes')).toBeInTheDocument();
    expect(screen.getByText('Colaboradores')).toBeInTheDocument();
  });

  it('opens the register of the person picked, filtered by their CPF', async () => {
    authenticate();
    stubPeople();
    renderSearch();

    await user.type(box(), 'Silva');
    await user.click(await screen.findByText('Pedro Silva'));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/pessoas/estudantes?q=52998224725',
    );
  });

  it('waits for a term worth searching before calling the API', async () => {
    authenticate();
    const seen = stubPeople();
    renderSearch();

    await user.type(box(), 'S');

    expect(await screen.findByText(/digite ao menos 2 caracteres/i)).toBeInTheDocument();
    expect(seen).toEqual([]);
  });

  it('searches each register once per settled term, not per keystroke', async () => {
    authenticate();
    const seen = stubPeople();
    renderSearch();

    await user.type(box(), 'Silva');

    await waitFor(() => expect(seen).toHaveLength(3));
    expect(seen.sort()).toEqual(['guardians:Silva', 'students:Silva', 'teachers:Silva']);
  });

  it('offers only guardian pages when the active context is Responsável', async () => {
    authenticate();
    const seen = stubPeople();
    renderSearch('guardian');

    await user.type(box(), 'Turmas');

    expect(await screen.findByText(/nada encontrado/i)).toBeInTheDocument();
    expect(seen).toEqual([]);

    await user.clear(box());
    await user.type(box(), 'Preceptoria');

    expect(await screen.findByText('Preceptoria')).toBeInTheDocument();
  });

  it('still shows what it found when a register fails', async () => {
    authenticate();
    server.use(
      http.get(apiUrl(GUARDIANS), () =>
        HttpResponse.json(
          { error: { code: 'forbidden', message: 'Acesso negado.', details: {} } },
          { status: 403 },
        ),
      ),
      http.get(apiUrl(STUDENTS), () => HttpResponse.json(page([pedro]))),
      http.get(apiUrl(TEACHERS), () => HttpResponse.json(page([carla]))),
    );

    renderSearch();

    await user.type(box(), 'Silva');

    expect(await screen.findByText('Pedro Silva')).toBeInTheDocument();
    expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument();
  });

  it('says so when nothing matches', async () => {
    authenticate();
    server.use(
      http.get(apiUrl(GUARDIANS), () => HttpResponse.json(page([]))),
      http.get(apiUrl(STUDENTS), () => HttpResponse.json(page([]))),
      http.get(apiUrl(TEACHERS), () => HttpResponse.json(page([]))),
    );

    renderSearch();

    await user.type(box(), 'Ninguém');

    expect(await screen.findByText(/nada encontrado/i)).toBeInTheDocument();
  });
});
