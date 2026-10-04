import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  DIRECTOR_TEMPLATE_ID,
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  http,
  jsonError,
  server,
  staffMembership,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser, Membership } from 'types/auth';
import LessonPlans from './LessonPlans';

const BASE = `/api/v1/schools/${SCHOOL_ID}/academics`;
const YEARS_BASE = `/api/v1/schools/${SCHOOL_ID}/school_years`;

const user = userEvent.setup({ delay: null });

const schoolClass = {
  id: 310,
  school_id: SCHOOL_ID,
  name: 'A',
  grade_level: 'fundamental_i_5',
  shift: 'matutino' as const,
  year: 2026,
  student_count: 18,
  subjects: [{ id: 12, school_id: SCHOOL_ID, name: 'Matemática' }],
};

const page = <T,>(rows: T[]) => ({
  data: rows,
  meta: { page: 1, per_page: 25, total: rows.length },
});

const teacherMembership: Membership = { ...staffMembership, role: 'teacher' };

const directorMembership: Membership = {
  ...staffMembership,
  id: 21,
  permissions: ['manage_school_settings'],
  permission_sources: { manage_school_settings: 'owner' },
  is_owner: true,
  role_template: {
    id: DIRECTOR_TEMPLATE_ID,
    name: 'Direção',
    system_key: 'director',
    is_system: true,
  },
  display_title: 'Diretor',
};

const authValueFor = (membership: Membership): AuthContextValue => ({
  user: {
    id: 1,
    email: membership.email ?? 'user@example.com',
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

const renderPage = (membership: Membership, search = '') => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(
    <MemoryRouter initialEntries={[`/academico/plano-de-aula${search}`]}>
      <AuthContext.Provider value={authValueFor(membership)}>
        <LessonPlans />
      </AuthContext.Provider>
    </MemoryRouter>,
    { memberships: [membership] },
  );
};

const chosenClass = `?school_class_id=${schoolClass.id}`;

describe('LessonPlans page — teacher view', () => {
  const stubTeacher = (instructionalDates: string[] = ['2026-02-10']) => {
    const saved: Record<string, unknown>[] = [];

    server.use(
      http.get(apiUrl(`${BASE}/school_classes`), () => HttpResponse.json(page([schoolClass]))),
      http.get(apiUrl(`${BASE}/school_classes/${schoolClass.id}/instructional_days`), () =>
        HttpResponse.json({
          data: {
            school_year_id: 1,
            starts_on: '2026-02-01',
            ends_on: '2026-12-18',
            instructional_dates: instructionalDates,
          },
        }),
      ),
      http.get(apiUrl(`${BASE}/lesson_plans`), () => HttpResponse.json(page([]))),
      http.put(apiUrl(`${BASE}/lesson_plans`), async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        saved.push(body);

        return HttpResponse.json({
          data: {
            id: 1,
            school_id: SCHOOL_ID,
            class_discipline_id: 99,
            ...(body.lesson_plan as object),
          },
        });
      }),
    );

    return saved;
  };

  it('lets a teacher open an instructional day and send a plan for one of their subjects', async () => {
    const saved = stubTeacher();
    renderPage(teacherMembership, chosenClass);

    const instructionalDay = await screen.findByRole('gridcell', { name: '10' });
    expect(instructionalDay).toBeEnabled();
    await user.click(instructionalDay);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: /matéria/i }));
    await user.click(await screen.findByRole('option', { name: 'Matemática' }));
    await user.type(screen.getByLabelText(/tema da aula/i), 'Frações — exercícios 1 a 5.');
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0]).toMatchObject({
      lesson_plan: {
        school_class_id: schoolClass.id,
        subject_id: 12,
        date: '2026-02-10',
        topic: 'Frações — exercícios 1 a 5.',
      },
    });

    // The dialog closes once the plan is saved.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('never lets a non-instructional day be clicked', async () => {
    stubTeacher(['2026-02-10']);
    renderPage(teacherMembership, chosenClass);

    const nonInstructionalDay = await screen.findByRole('gridcell', { name: '11' });

    // Testing Library itself refuses to dispatch a pointer event on a disabled element — which is
    // exactly the guarantee this test is after: a non-instructional day cannot be clicked at all.
    expect(nonInstructionalDay).toBeDisabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the 422 the API answers when a day turns out not to be instructional after all', async () => {
    stubTeacher();
    server.use(
      http.put(apiUrl(`${BASE}/lesson_plans`), () =>
        jsonError(422, 'non_instructional_day', 'Este dia não é letivo.'),
      ),
    );
    renderPage(teacherMembership, chosenClass);

    await user.click(await screen.findByRole('gridcell', { name: '10' }));
    await user.click(await screen.findByRole('combobox', { name: /matéria/i }));
    await user.click(await screen.findByRole('option', { name: 'Matemática' }));
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText(/este dia não é letivo/i)).toBeInTheDocument();
  });

  it('reports a teacher not assigned to the subject with the API 403', async () => {
    stubTeacher();
    server.use(
      http.put(apiUrl(`${BASE}/lesson_plans`), () =>
        jsonError(403, 'forbidden', 'Você não leciona esta matéria nesta turma.'),
      ),
    );
    renderPage(teacherMembership, chosenClass);

    await user.click(await screen.findByRole('gridcell', { name: '10' }));
    await user.click(await screen.findByRole('combobox', { name: /matéria/i }));
    await user.click(await screen.findByRole('option', { name: 'Matemática' }));
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText(/não leciona esta matéria/i)).toBeInTheDocument();
  });

  it('reports a failure loading the calendar instead of going silently empty', async () => {
    stubTeacher();
    server.use(
      http.get(apiUrl(`${BASE}/school_classes/${schoolClass.id}/instructional_days`), () =>
        jsonError(404, 'not_found', 'Turma não encontrada.'),
      ),
    );
    renderPage(teacherMembership, chosenClass);

    expect(await screen.findByText(/turma não encontrada/i)).toBeInTheDocument();
  });
});

describe('LessonPlans page — admin view (BR-SY10)', () => {
  const activeYear = {
    id: 7,
    school_id: SCHOOL_ID,
    name: '2026',
    starts_on: '2026-02-01',
    ends_on: '2026-12-18',
    status: 'active',
  };

  const stubAdmin = () => {
    const saved: Record<string, unknown>[] = [];

    server.use(
      http.get(apiUrl(`${YEARS_BASE}/active`), () => HttpResponse.json({ data: activeYear })),
      http.get(apiUrl(`${YEARS_BASE}/${activeYear.id}/instructional_days`), () =>
        HttpResponse.json({ data: [{ date: '2026-02-10', instructional: true }] }),
      ),
      http.put(apiUrl(`${YEARS_BASE}/${activeYear.id}/instructional_days`), async ({ request }) => {
        const body = (await request.json()) as { instructional_days: unknown[] };
        saved.push(body);

        return HttpResponse.json({ data: body.instructional_days });
      }),
    );

    return saved;
  };

  it('shows the day-marking calendar instead of the teacher flow for a non-teacher staff membership', async () => {
    stubAdmin();
    renderPage(directorMembership);

    expect(await screen.findByText(/dias letivos/i)).toBeInTheDocument();
    // The teacher-only class picker has no reason to exist here.
    expect(screen.queryByRole('combobox', { name: /^turma$/i })).not.toBeInTheDocument();
  });

  it('lets someone with manage_school_settings toggle a day and save the change', async () => {
    const saved = stubAdmin();
    renderPage(directorMembership);

    await screen.findByText(/dias letivos/i);

    // 2026-02-10 already comes back instructional; 2026-02-12 starts out plain.
    const day12 = await screen.findByRole('gridcell', { name: '12' });
    await user.click(day12);

    await user.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0]).toMatchObject({
      instructional_days: [{ date: '2026-02-12', instructional: true }],
    });
    expect(await screen.findByText(/dias letivos atualizados/i)).toBeInTheDocument();
  });

  it('does not let a staff membership without manage_school_settings change anything', async () => {
    stubAdmin();
    renderPage(staffMembership);

    await screen.findByText(/dias letivos/i);
    expect(screen.queryByRole('button', { name: /salvar alterações/i })).not.toBeInTheDocument();
    expect(screen.getByText(/apenas quem administra/i)).toBeInTheDocument();
  });

  it('says so instead of showing a calendar when there is no active school year', async () => {
    server.use(
      http.get(apiUrl(`${YEARS_BASE}/active`), () =>
        jsonError(404, 'not_found', 'Nenhum ano letivo ativo.'),
      ),
    );
    renderPage(directorMembership);

    expect(await screen.findByText(/nenhum ano letivo ativo/i)).toBeInTheDocument();
  });
});
