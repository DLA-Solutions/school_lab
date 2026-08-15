import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import Lessons from './Lessons';

const BASE = `/api/v1/schools/${SCHOOL_ID}/academics`;

const user = userEvent.setup({ delay: null });

const schoolClass = {
  id: 4,
  school_id: SCHOOL_ID,
  name: 'A',
  grade_level: 'fundamental_i_5',
  shift: 'matutino' as const,
  year: 2026,
  student_count: 0,
  subjects: [],
};

const assignment = (id: number, teacher: string, subject: string) => ({
  id,
  school_id: SCHOOL_ID,
  teacher_id: id,
  school_class_id: schoolClass.id,
  subject_id: id,
  teacher_name: teacher,
  subject_name: subject,
  school_class: {
    id: schoolClass.id,
    name: 'A',
    grade_level: 'fundamental_i_5',
    shift: 'matutino' as const,
    year: 2026,
    label: 'Ensino Fundamental I — 5º ano A · Matutino — 2026',
  },
});

const page = <T,>(rows: T[]) => ({
  data: rows,
  meta: { page: 1, per_page: 25, total: rows.length },
});

const stub = () => {
  const queries: URLSearchParams[] = [];

  server.use(
    http.get(apiUrl(`${BASE}/teaching_assignments`), ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json(
        page([assignment(1, 'Carla Nogueira', 'Matemática'), assignment(2, 'Bruno Alves', 'Ciências')]),
      );
    }),
    http.get(apiUrl(`${BASE}/school_classes`), () => HttpResponse.json(page([schoolClass]))),
    http.get(apiUrl(`${BASE}/subjects`), () =>
      HttpResponse.json(page([{ id: 1, school_id: SCHOOL_ID, name: 'Matemática' }])),
    ),
    http.get(apiUrl(`${BASE}/teachers`), () => HttpResponse.json(page([]))),
  );

  return queries;
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

const renderPage = () => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <Lessons />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

describe('Lessons page', () => {
  // A lesson is a teacher, a subject and a cohort — the three together are the unit.
  it('gives a row per teacher, subject and cohort', async () => {
    stub();
    renderPage();

    expect(await screen.findByText('Carla Nogueira')).toBeInTheDocument();
    expect(screen.getByText('Bruno Alves')).toBeInTheDocument();
    expect(screen.getAllByText(/5º ano A · Matutino — 2026/).length).toBe(2);
  });

  it('searches by one term, whatever it names', async () => {
    const queries = stub();
    renderPage();
    await screen.findByText('Carla Nogueira');

    await user.type(screen.getByRole('textbox', { name: /buscar aulas/i }), 'Carla');

    await waitFor(() => expect(queries.some((q) => q.get('q') === 'Carla')).toBe(true));
  });

  it('narrows by subject and by year', async () => {
    const queries = stub();
    renderPage();
    await screen.findByText('Carla Nogueira');

    await user.click(screen.getByRole('combobox', { name: /matéria/i }));
    await user.click(await screen.findByRole('option', { name: 'Matemática' }));

    await waitFor(() => expect(queries.some((q) => q.get('subject_id') === '1')).toBe(true));

    await user.click(screen.getByRole('combobox', { name: /^ano$/i }));
    await user.click(await screen.findByRole('option', { name: '2026' }));

    await waitFor(() => expect(queries.some((q) => q.get('year') === '2026')).toBe(true));
  });

  // The year is its own filter, so repeating it in the class options made one cohort look like
  // several.
  it('offers the cohort by its letter alone', async () => {
    stub();
    renderPage();
    await screen.findByText('Carla Nogueira');

    await user.click(screen.getByRole('combobox', { name: /^turma$/i }));
    const listbox = await screen.findByRole('listbox');

    expect(within(listbox).getByRole('option', { name: 'A' })).toBeInTheDocument();
    expect(within(listbox).queryByRole('option', { name: /A — 2026/ })).not.toBeInTheDocument();
  });

  it('opens the form for a new lesson', async () => {
    stub();
    renderPage();
    await screen.findByText('Carla Nogueira');

    await user.click(screen.getByRole('button', { name: /nova aula/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  // Turmas and Matérias are what a lesson is made of, so they are reached from here.
  describe('the other tabs', () => {
    // The page above already names itself and carries the tabs, so a second heading inside the
    // tab said the same thing twice — and `PageHeader` pushed its toolbar to the right, which put
    // the same controls in a different place on each tab.
    it('drops the heading inside a tab but keeps the toolbar', async () => {
      stub();
      renderPage();
      await screen.findByText('Carla Nogueira');

      await user.click(screen.getByRole('tab', { name: /turmas/i }));

      expect(await screen.findByRole('textbox', { name: /buscar turmas/i })).toBeInTheDocument();
      // The tab label stays; the page heading it used to duplicate does not.
      expect(screen.getAllByText('Turmas').length).toBe(1);
    });

    it('carries Turmas and Matérias, each with its own search', async () => {
      stub();
      renderPage();
      await screen.findByText('Carla Nogueira');

      await user.click(screen.getByRole('tab', { name: /turmas/i }));
      expect(await screen.findByRole('textbox', { name: /buscar turmas/i })).toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: /matérias/i }));
      expect(await screen.findByRole('textbox', { name: /buscar matérias/i })).toBeInTheDocument();
    });
  });
});
