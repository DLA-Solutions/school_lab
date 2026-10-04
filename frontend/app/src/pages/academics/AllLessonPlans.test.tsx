import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser, Membership } from 'types/auth';
import AllLessonPlans from './AllLessonPlans';

const BASE = `/api/v1/schools/${SCHOOL_ID}/academics`;

const user = userEvent.setup({ delay: null });

const coordinationMembership: Membership = {
  ...staffMembership,
  permissions: ['manage_academic'],
  permission_sources: { manage_academic: 'template' },
};

const schoolClass = {
  id: 310,
  school_id: SCHOOL_ID,
  name: 'A',
  grade_level: 'fundamental_i_5',
  shift: 'matutino' as const,
  year: 2026,
  student_count: 18,
  subjects: [],
};

const subject = { id: 12, school_id: SCHOOL_ID, name: 'Matemática' };

const teacher = {
  id: 42,
  school_id: SCHOOL_ID,
  name: 'Carla Souza',
  cpf: '11122233344',
  email: null,
  phone: null,
  job_position_id: 1,
  job_title: 'Professora',
  hired_on: null,
  zip_code: null,
  street: null,
  number: null,
  complement: null,
  neighborhood: null,
  city: null,
  state: null,
  classes: [],
};

const page = <T,>(rows: T[]) => ({
  data: rows,
  meta: { page: 1, per_page: 25, total: rows.length },
});

const lessonPlanRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  school_id: SCHOOL_ID,
  school_class_id: schoolClass.id,
  subject_id: subject.id,
  class_discipline_id: 10,
  teacher_id: teacher.id,
  teacher_name: teacher.name,
  subject_name: subject.name,
  school_class_name: schoolClass.name,
  date: '2026-04-14',
  duration: null,
  unit_stage: null,
  topic: 'Frações — exercícios 1 a 5.',
  general_objective: null,
  specific_objectives: null,
  bncc_competencies: null,
  other_competencies: null,
  resources_materials: null,
  assessment_types: [],
  assessment_formats: [],
  ...overrides,
});

const authValueFor = (membership: Membership): AuthContextValue => ({
  user: {
    id: 1,
    email: membership.email ?? 'coordenacao@example.com',
    status: 'active',
    memberships: [membership],
    guardian_profiles: [],
  } as AuthUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
});

const renderPage = (membership: Membership) => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(
    <MemoryRouter>
      <AuthContext.Provider value={authValueFor(membership)}>
        <AllLessonPlans />
      </AuthContext.Provider>
    </MemoryRouter>,
    { memberships: [membership] },
  );
};

const stubOptions = () => {
  server.use(
    http.get(apiUrl(`${BASE}/teachers`), () => HttpResponse.json(page([teacher]))),
    http.get(apiUrl(`${BASE}/subjects`), () => HttpResponse.json(page([subject]))),
    http.get(apiUrl(`${BASE}/school_classes`), () => HttpResponse.json(page([schoolClass]))),
  );
};

describe('AllLessonPlans page — access', () => {
  it('shows the no-access state for staff without manage_academic, even though the menu already hides it', async () => {
    renderPage(staffMembership);

    expect(await screen.findByText(/sem acesso a esta área/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: /^professor$/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the no-access state when there is no active school membership', async () => {
    renderPage({ ...staffMembership, role: 'guardian' });

    expect(await screen.findByText(/sem acesso a esta área/i)).toBeInTheDocument();
  });
});

describe('AllLessonPlans page — coordination list (UC-LP04/AC-LP07)', () => {
  it('lists every lesson plan with teacher, subject, class, date and topic', async () => {
    stubOptions();
    server.use(
      http.get(apiUrl(`${BASE}/lesson_plans`), ({ request }) =>
        HttpResponse.json(page([lessonPlanRow()]), {
          headers: { 'x-query': new URL(request.url).search },
        }),
      ),
    );

    renderPage(coordinationMembership);

    const row = await screen.findByRole('row', { name: /carla souza/i });
    expect(within(row).getByText('Matemática')).toBeInTheDocument();
    expect(within(row).getByText('A')).toBeInTheDocument();
    expect(within(row).getByText(/frações — exercícios 1 a 5/i)).toBeInTheDocument();
  });

  it('shows a dash for a class_discipline with no teacher assigned', async () => {
    stubOptions();
    server.use(
      http.get(apiUrl(`${BASE}/lesson_plans`), ({ request }) =>
        HttpResponse.json(page([lessonPlanRow({ teacher_id: null, teacher_name: null })]), {
          headers: { 'x-query': new URL(request.url).search },
        }),
      ),
    );

    renderPage(coordinationMembership);

    const row = await screen.findByRole('row', { name: /frações/i });
    expect(within(row).getByText('—')).toBeInTheDocument();
  });

  it('sends the chosen teacher, subject and class filters as query params', async () => {
    stubOptions();
    const queries: URLSearchParams[] = [];

    server.use(
      http.get(apiUrl(`${BASE}/lesson_plans`), ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json(page([lessonPlanRow()]));
      }),
    );

    renderPage(coordinationMembership);
    await screen.findByRole('row', { name: /carla souza/i });

    await user.click(screen.getByRole('combobox', { name: /^professor$/i }));
    await user.click(await screen.findByRole('option', { name: 'Carla Souza' }));

    await user.click(screen.getByRole('combobox', { name: /^matéria$/i }));
    await user.click(await screen.findByRole('option', { name: 'Matemática' }));

    await user.click(screen.getByRole('combobox', { name: /^turma$/i }));
    await user.click(
      await screen.findByRole('option', { name: /ensino fundamental i — 5º ano a/i }),
    );

    await waitFor(() => {
      const last = queries[queries.length - 1];
      expect(last.get('teacher_id')).toBe(String(teacher.id));
      expect(last.get('subject_id')).toBe(String(subject.id));
      expect(last.get('school_class_id')).toBe(String(schoolClass.id));
    });
  });

  it('reports a failure loading the list instead of going silently empty', async () => {
    stubOptions();
    server.use(http.get(apiUrl(`${BASE}/lesson_plans`), () => HttpResponse.error()));

    renderPage(coordinationMembership);

    expect(await screen.findByText(/não foi possível carregar os planos de aula/i)).toBeInTheDocument();
  });
});

describe('AllLessonPlans page — PDF preview', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock/1');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('previews the plan PDF via the row action, reusing the existing preview dialog', async () => {
    stubOptions();
    server.use(
      http.get(apiUrl(`${BASE}/lesson_plans`), () => HttpResponse.json(page([lessonPlanRow()]))),
      http.get(apiUrl(`${BASE}/lesson_plans/1/pdf`), () =>
        HttpResponse.arrayBuffer(new TextEncoder().encode('%PDF-1.4').buffer, {
          headers: { 'Content-Type': 'application/pdf' },
        }),
      ),
    );

    renderPage(coordinationMembership);

    const row = await screen.findByRole('row', { name: /carla souza/i });
    await user.click(within(row).getByRole('button', { name: /pré-visualizar/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    const frame = await screen.findByTitle('Plano de Aula');
    expect(frame).toHaveAttribute('src', 'blob:mock/1');
  });
});
