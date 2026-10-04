import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser, Membership } from 'types/auth';
import DailyRoutine from './DailyRoutine';

const BASE = `/api/v1/schools/${SCHOOL_ID}/academics`;

const user = userEvent.setup({ delay: null });

const schoolClass = {
  id: 310,
  school_id: SCHOOL_ID,
  name: 'A',
  grade_level: 'infantil_1',
  shift: 'matutino' as const,
  year: 2026,
  student_count: 2,
  subjects: [],
};

const page = <T,>(rows: T[]) => ({
  data: rows,
  meta: { page: 1, per_page: 25, total: rows.length },
});

const teacherMembership: Membership = { ...staffMembership, role: 'teacher' };

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

const renderPage = (membership: Membership, search: string) => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(
    <MemoryRouter initialEntries={[`/academico/rotina-diaria${search}`]}>
      <AuthContext.Provider value={authValueFor(membership)}>
        <DailyRoutine />
      </AuthContext.Provider>
    </MemoryRouter>,
    { memberships: [membership] },
  );
};

const query = `?school_class_id=${schoolClass.id}&date=2026-02-10`;

describe('DailyRoutine page', () => {
  const stub = () => {
    const saved: Record<string, unknown>[] = [];

    server.use(
      http.get(apiUrl(`${BASE}/school_classes`), () => HttpResponse.json(page([schoolClass]))),
      http.get(apiUrl(`${BASE}/school_classes/${schoolClass.id}/daily_routine_entries`), () =>
        HttpResponse.json({
          data: [
            { student_id: 1, student_name: 'Maria Silva', daily_routine_entry: null },
            {
              student_id: 2,
              student_name: 'João Souza',
              daily_routine_entry: {
                id: 50,
                student_id: 2,
                date: '2026-02-10',
                snack_eaten: true,
                poop_count: 1,
                pee_count: 0,
                notes: null,
                status: 'draft',
                sent_at: null,
                sent_by_membership_id: null,
                recorded_by_membership_id: 1,
              },
            },
          ],
        }),
      ),
      http.put(apiUrl(`${BASE}/daily_routine_entries`), async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        saved.push(body);

        return HttpResponse.json({
          data: {
            id: 99,
            status: 'draft',
            sent_at: null,
            sent_by_membership_id: null,
            recorded_by_membership_id: 1,
            poop_count: 0,
            pee_count: 0,
            snack_eaten: null,
            notes: null,
            ...(body.daily_routine_entry as object),
          },
        });
      }),
    );

    return saved;
  };

  it('renders the roster for the chosen class and date, each student with their own entry (or none yet)', async () => {
    stub();
    renderPage(teacherMembership, query);

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('João Souza')).toBeInTheDocument();
    // João already has a draft entry; Maria has none yet.
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
  });

  it('upserts a draft entry immediately when the poop icon is tapped (UC-DR02, BR-DR04)', async () => {
    const saved = stub();
    renderPage(teacherMembership, query);

    await screen.findByText('Maria Silva');

    const poopButton = screen.getByRole('button', {
      name: /Maria Silva fez cocô — 0 vez\(es\)/i,
    });
    await user.click(poopButton);

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0]).toMatchObject({
      daily_routine_entry: { student_id: 1, date: '2026-02-10', poop_count: 1 },
    });
  });
});
