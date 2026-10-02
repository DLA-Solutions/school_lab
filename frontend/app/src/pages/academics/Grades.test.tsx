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

const book = {
  context: {
    school_class_id: 4,
    school_class_label: 'Ensino Fundamental I 5º ano A · Matutino — 2026',
    subject_id: 7,
    subject_name: 'Matemática',
    class_discipline_id: 67,
    year: 2026,
  },
  periods: [
    {
      id: 11,
      name: '1º trimestre',
      sequence: 1,
      closed: false,
      components: [
        { id: 101, name: 'P1', position: 1, weight_percent: 40 },
        { id: 102, name: 'P2', position: 2, weight_percent: 40 },
        { id: 103, name: 'Trabalho', position: 3, weight_percent: 20 },
      ],
    },
    {
      id: 12,
      name: '2º trimestre',
      sequence: 2,
      closed: true,
      components: [
        { id: 104, name: 'P1', position: 1, weight_percent: 40 },
        { id: 105, name: 'P2', position: 2, weight_percent: 40 },
        { id: 106, name: 'Trabalho', position: 3, weight_percent: 20 },
      ],
    },
  ],
  students: [
    { id: 1, name: 'Ana', entries: { 11: { 101: 8.5, 102: null, 103: null }, 12: {} } },
    { id: 2, name: 'Pedro', entries: { 11: { 101: null, 102: null, 103: null }, 12: {} } },
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
    http.get(apiUrl(`${BASE}/classes/4/grade_book`), () => HttpResponse.json({ data: book })),
    http.put(apiUrl(`${BASE}/classes/4/grade_book/entries`), async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      saved.push(body);
      return HttpResponse.json({
        data: {
          student_id: 1,
          academic_period_id: 11,
          evaluation_component_id: 101,
          value: '9.0',
        },
      });
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
  loginWithGoogle: vi.fn(),
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

  it('lays the roll down, the terms across, and each term split into its components', async () => {
    stub();
    renderPage(chosen);

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Pedro')).toBeInTheDocument();
    expect(screen.getByText('1º trimestre')).toBeInTheDocument();
    expect(screen.getByText('2º trimestre')).toBeInTheDocument();
    expect(screen.getAllByText('P1')).toHaveLength(2);
    expect(screen.getAllByText('P2')).toHaveLength(2);
    expect(screen.getAllByText('Trabalho')).toHaveLength(2);
  });

  it('shows the marks already given, and leaves the rest empty', async () => {
    stub();
    renderPage(chosen);

    const ana = await screen.findByLabelText(/nota de ana.*1º trimestre.*p1/i);
    const pedro = screen.getByLabelText(/nota de pedro.*1º trimestre.*p1/i);

    expect(ana).toHaveValue('8,5');
    expect(pedro).toHaveValue('');
  });

  // A teacher marking thirty children should not lose the lot because they closed the tab.
  it('saves a cell on its own once typing settles', async () => {
    const saved = stub();
    renderPage(chosen);

    await user.type(await screen.findByLabelText(/nota de pedro.*1º trimestre.*p1/i), '9');

    await waitFor(() => expect(saved.length).toBeGreaterThan(0));
    expect(saved[saved.length - 1]).toMatchObject({
      grade_entry: {
        student_id: 2,
        academic_period_id: 11,
        evaluation_component_id: 101,
        value: '9',
      },
    });
  });

  // An emptied cell means "not given yet", which is not the same as a zero.
  it('sends a cleared cell as empty rather than as zero', async () => {
    const saved = stub();
    renderPage(chosen);

    await user.clear(await screen.findByLabelText(/nota de ana.*1º trimestre.*p1/i));

    await waitFor(() => expect(saved.length).toBeGreaterThan(0));
    expect(
      (saved[saved.length - 1] as { grade_entry: { value: string | null } }).grade_entry.value,
    ).toBeNull();
  });

  // A cell is identified by student + period + component, so marking one component never bleeds
  // into another component of the same period.
  it('saves the right component when the sheet has more than one per term', async () => {
    const saved = stub();
    renderPage(chosen);

    await user.type(await screen.findByLabelText(/nota de pedro.*1º trimestre.*trabalho/i), '7');

    await waitFor(() => expect(saved.length).toBeGreaterThan(0));
    expect(saved[saved.length - 1]).toMatchObject({
      grade_entry: { student_id: 2, academic_period_id: 11, evaluation_component_id: 103 },
    });
  });

  // A closed term is the school's record of what was awarded.
  it('will not let a closed term be typed into', async () => {
    stub();
    renderPage(chosen);

    expect(await screen.findByLabelText(/nota de ana.*2º trimestre.*p1/i)).toBeDisabled();
    expect(screen.getByText(/fechado/i)).toBeInTheDocument();
  });

  it('refuses a mark outside the scale without calling the API', async () => {
    const saved = stub();
    renderPage(chosen);

    await user.type(await screen.findByLabelText(/nota de pedro.*1º trimestre.*p1/i), '11');

    await waitFor(() =>
      expect(screen.getByLabelText(/nota de pedro.*1º trimestre.*p1/i)).toHaveAttribute(
        'aria-invalid',
        'true',
      ),
    );
    expect(saved).toHaveLength(0);
  });

  // The class and the subject are picked in dropdowns and the year is implied by the class, so
  // without a heading the teacher marks a wall of numbers with nothing confirming whose year it is.
  it('names the class, the subject and the year being marked', async () => {
    stub();
    renderPage(chosen);

    // The class label the API words already carries the year, so one heading names all three.
    const heading = await screen.findByText(/lançando notas de matemática/i);
    expect(heading).toHaveTextContent('Ensino Fundamental I 5º ano A · Matutino — 2026');
  });

  // A sheet that widened to every term the school ever had is how a mark meant for this year gets
  // filed under a term of another one. With none set up for the year, it says so.
  it('says the year has no terms instead of showing an empty grid', async () => {
    stub();
    server.use(
      http.get(apiUrl(`${BASE}/classes/4/grade_book`), () =>
        HttpResponse.json({ data: { ...book, periods: [] } }),
      ),
    );

    renderPage(chosen);

    expect(await screen.findByText(/nenhum bimestre cadastrado para 2026/i)).toBeInTheDocument();
  });

  // The API refuses a lesson the teacher is not assigned to, and says which.
  it("reports a lesson that is not the teacher's", async () => {
    server.use(
      http.get(apiUrl(`${BASE}/school_classes`), () => HttpResponse.json(page([schoolClass]))),
      http.get(apiUrl(`${BASE}/subjects`), () => HttpResponse.json(page([]))),
      http.get(apiUrl(`${BASE}/classes/4/grade_book`), () =>
        jsonError(403, 'forbidden', 'Você não leciona esta matéria nesta turma.'),
      ),
    );

    renderPage(chosen);

    expect(await screen.findByText(/não leciona esta matéria/i)).toBeInTheDocument();
  });

  // A failure loading the class/subject dropdowns used to leave them silently empty with no
  // indication anything went wrong — the teacher just saw nothing to pick from.
  it('reports when the class and subject dropdowns fail to load instead of going silently empty', async () => {
    server.use(
      http.get(apiUrl(`${BASE}/school_classes`), () => jsonError(403, 'forbidden', 'Sem permissão.')),
      http.get(apiUrl(`${BASE}/subjects`), () => jsonError(403, 'forbidden', 'Sem permissão.')),
    );

    renderPage();

    expect(await screen.findByText(/sem permissão/i)).toBeInTheDocument();
  });
});
