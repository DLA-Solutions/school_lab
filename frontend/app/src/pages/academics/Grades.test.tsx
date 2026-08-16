import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, http, jsonError, server, staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import Grades from './Grades';

const BASE = `/api/v1/schools/${SCHOOL_ID}/academics`;

const user = userEvent.setup({ delay: null });

const schoolClass = {
  id: 4,
  school_id: SCHOOL_ID,
  name: 'A',
  grade_level: 'fundamental_i_5',
  shift: 'matutino' as const,
  year: 2026,
  student_count: 2,
  subjects: [],
};

const sheet = {
  periods: [
    { id: 11, name: '1º bimestre', sequence: 1, closed: false },
    { id: 12, name: '2º bimestre', sequence: 2, closed: true },
  ],
  students: [
    { id: 1, name: 'Ana', scores: { 11: 8.5, 12: null } },
    { id: 2, name: 'Pedro', scores: { 11: null, 12: null } },
  ],
};

const page = <T,>(rows: T[]) => ({
  data: rows,
  meta: { page: 1, per_page: 25, total: rows.length },
});

const stub = () => {
  const saved: Record<string, unknown>[] = [];

  server.use(
    http.get(apiUrl(`${BASE}/school_classes`), () => HttpResponse.json(page([schoolClass]))),
    http.get(apiUrl(`${BASE}/subjects`), () =>
      HttpResponse.json(page([{ id: 7, school_id: SCHOOL_ID, name: 'Matemática' }])),
    ),
    http.get(apiUrl(`${BASE}/grades`), () => HttpResponse.json({ data: sheet })),
    http.put(apiUrl(`${BASE}/grades/cell`), async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      saved.push(body);
      return HttpResponse.json({ data: { student_id: 1, academic_period_id: 11, score: 9 } });
    }),
  );

  return saved;
};

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

const renderPage = (search = '') => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(
    <MemoryRouter initialEntries={[`/academico/notas${search}`]}>
      <AuthContext.Provider value={authValue}>
        <Grades />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

const chosen = `?school_class_id=${schoolClass.id}&subject_id=7`;

describe('Grades page', () => {
  it('asks for a class and a subject before showing anything', async () => {
    stub();
    renderPage();

    expect(await screen.findByText(/escolha a turma e a matéria/i)).toBeInTheDocument();
  });

  it('lays the roll down and the terms across', async () => {
    stub();
    renderPage(chosen);

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Pedro')).toBeInTheDocument();
    expect(screen.getByText('1º bimestre')).toBeInTheDocument();
    expect(screen.getByText('2º bimestre')).toBeInTheDocument();
  });

  it('shows the marks already given, and leaves the rest empty', async () => {
    stub();
    renderPage(chosen);

    const ana = await screen.findByLabelText(/nota de ana no 1º bimestre/i);
    const pedro = screen.getByLabelText(/nota de pedro no 1º bimestre/i);

    expect(ana).toHaveValue('8,5');
    expect(pedro).toHaveValue('');
  });

  // A teacher marking thirty children should not lose the lot because they closed the tab.
  it('saves a cell on its own once typing settles', async () => {
    const saved = stub();
    renderPage(chosen);

    await user.type(await screen.findByLabelText(/nota de pedro no 1º bimestre/i), '9');

    await waitFor(() => expect(saved.length).toBeGreaterThan(0));
    expect(saved[saved.length - 1]).toMatchObject({
      school_class_id: schoolClass.id,
      subject_id: 7,
      grade: { student_id: 2, academic_period_id: 11, score: 9 },
    });
  });

  // An emptied cell means "not given yet", which is not the same as a zero.
  it('sends a cleared cell as empty rather than as zero', async () => {
    const saved = stub();
    renderPage(chosen);

    await user.clear(await screen.findByLabelText(/nota de ana no 1º bimestre/i));

    await waitFor(() => expect(saved.length).toBeGreaterThan(0));
    expect((saved[saved.length - 1] as { grade: { score: number | null } }).grade.score).toBeNull();
  });

  // A closed term is the school's record of what was awarded.
  it('will not let a closed term be typed into', async () => {
    stub();
    renderPage(chosen);

    expect(await screen.findByLabelText(/nota de ana no 2º bimestre/i)).toBeDisabled();
    expect(screen.getByText(/fechado/i)).toBeInTheDocument();
  });

  it('refuses a mark outside the scale without calling the API', async () => {
    const saved = stub();
    renderPage(chosen);

    await user.type(await screen.findByLabelText(/nota de pedro no 1º bimestre/i), '11');

    await waitFor(() =>
      expect(screen.getByLabelText(/nota de pedro no 1º bimestre/i)).toHaveAttribute(
        'aria-invalid',
        'true',
      ),
    );
    expect(saved).toHaveLength(0);
  });

  // The API refuses a lesson the teacher is not assigned to, and says which.
  it("reports a lesson that is not the teacher's", async () => {
    server.use(
      http.get(apiUrl(`${BASE}/school_classes`), () => HttpResponse.json(page([schoolClass]))),
      http.get(apiUrl(`${BASE}/subjects`), () => HttpResponse.json(page([]))),
      http.get(apiUrl(`${BASE}/grades`), () =>
        jsonError(403, 'forbidden', 'Você não leciona esta matéria nesta turma.'),
      ),
    );

    renderPage(chosen);

    expect(await screen.findByText(/não leciona esta matéria/i)).toBeInTheDocument();
  });
});
