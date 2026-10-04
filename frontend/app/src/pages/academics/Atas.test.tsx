import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  DIRECTOR_TEMPLATE_ID,
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  http,
  server,
  staffMembership,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser, Membership } from 'types/auth';
import Atas from './Atas';

const BASE = `/api/v1/schools/${SCHOOL_ID}/academics`;

const user = userEvent.setup({ delay: null });

const teacherMembership: Membership = { ...staffMembership, role: 'teacher', role_template: null };

const directorMembership: Membership = {
  ...staffMembership,
  id: 21,
  permissions: ['manage_academic'],
  permission_sources: { manage_academic: 'template' },
  role_template: {
    id: DIRECTOR_TEMPLATE_ID,
    name: 'Direção',
    system_key: 'director',
    is_system: true,
  },
  display_title: 'Diretor',
};

const roll = [
  { id: 1, name: 'Pedro Silva', school_class_name: 'A — 2026', guardian_names: ['Marcela Silva'] },
];

const incidentRow = (overrides: Record<string, unknown> = {}) => ({
  id: 5,
  student_id: 1,
  incident_type_id: 9,
  category: 'pastoral',
  severity: null,
  visibility: 'staff_only',
  status: 'pending_approval',
  description: null,
  guardian_points_raised: 'A família relatou dificuldades com a lição de casa.',
  school_response: 'A escola vai acompanhar de perto nas próximas semanas.',
  published_at: null,
  created_at: '2026-03-10T12:00:00Z',
  updated_at: '2026-03-10T12:00:00Z',
  reported_by_membership_id: 11,
  coordination_approved_at: null,
  coordination_approved_by_membership_id: null,
  director_approved_at: null,
  director_approved_by_membership_id: null,
  student_name: 'Pedro Silva',
  incident_type_name: 'Reunião com os pais',
  guardians: [{ guardian_id: 31, name: 'Marcela Silva', relationship: 'mother' }],
  ...overrides,
});

const page = <T,>(rows: T[]) => ({
  data: rows,
  meta: { page: 1, per_page: 25, total: rows.length },
});

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

const renderPage = (membership: Membership) => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(
    <MemoryRouter initialEntries={['/academico/atas']}>
      <AuthContext.Provider value={authValueFor(membership)}>
        <Atas />
      </AuthContext.Provider>
    </MemoryRouter>,
    { memberships: [membership] },
  );
};

describe('Atas page — teacher creating a "nota ata"', () => {
  it('records one for a student from the roll and lists it right after', async () => {
    const created: Record<string, unknown>[] = [];
    let listed = false;

    server.use(
      http.get(apiUrl(`${BASE}/preceptorship_reports/roll`), () => HttpResponse.json({ data: roll })),
      http.get(apiUrl(`${BASE}/incidents`), () => {
        const body = listed ? page([incidentRow()]) : page([]);
        return HttpResponse.json(body);
      }),
      http.post(apiUrl(`${BASE}/incidents`), async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        created.push(body);
        listed = true;

        return HttpResponse.json({ data: incidentRow() }, { status: 201 });
      }),
    );

    renderPage(teacherMembership);

    await screen.findByText(/nenhuma ata registrada/i);

    // The empty state offers its own "new" action alongside the page header's — either opens the
    // same dialog, so the first one found is enough.
    await user.click(screen.getAllByRole('button', { name: /nova nota ata/i })[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: /aluno/i }));
    await user.click(await screen.findByRole('option', { name: /pedro silva/i }));

    await user.type(
      screen.getByLabelText(/pontos trazidos pelos pais/i),
      'A família relatou dificuldades com a lição de casa.',
    );
    await user.type(
      screen.getByLabelText(/respostas da escola/i),
      'A escola vai acompanhar de perto nas próximas semanas.',
    );

    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(created).toHaveLength(1));
    expect(created[0]).toMatchObject({
      incident: {
        student_id: 1,
        guardian_points_raised: 'A família relatou dificuldades com a lição de casa.',
        school_response: 'A escola vai acompanhar de perto nas próximas semanas.',
      },
    });
    // The parent-meeting "Ata" entry never sends its own type/category/visibility — the API
    // resolves the seeded guardian-meeting default on its own.
    expect(created[0].incident).not.toHaveProperty('incident_type_id');
    expect(created[0].incident).not.toHaveProperty('visibility');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(await screen.findByText('Pedro Silva')).toBeInTheDocument();
    expect(screen.getByText('Mãe: Marcela Silva')).toBeInTheDocument();
  });
});

describe('Atas page — PDF preview', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock/1');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the ata as a PDF, shows the iframe, and releases the file on close', async () => {
    server.use(
      http.get(apiUrl(`${BASE}/incidents`), () => HttpResponse.json(page([incidentRow()]))),
      http.get(apiUrl(`${BASE}/incidents/5/pdf`), () =>
        HttpResponse.arrayBuffer(new TextEncoder().encode('%PDF-1.4').buffer, {
          headers: { 'Content-Type': 'application/pdf' },
        }),
      ),
    );

    renderPage(directorMembership);

    const row = await screen.findByRole('row', { name: /pedro silva/i });
    await user.click(within(row).getByRole('button', { name: /pré-visualizar/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    const frame = await screen.findByTitle('Ata');
    expect(frame).toHaveAttribute('src', 'blob:mock/1');

    await user.click(screen.getByRole('button', { name: /fechar/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock/1'));
  });

  it('shows an error banner when the PDF cannot be fetched', async () => {
    server.use(
      http.get(apiUrl(`${BASE}/incidents`), () => HttpResponse.json(page([incidentRow()]))),
      http.get(apiUrl(`${BASE}/incidents/5/pdf`), () => HttpResponse.error()),
    );

    renderPage(directorMembership);

    const row = await screen.findByRole('row', { name: /pedro silva/i });
    await user.click(within(row).getByRole('button', { name: /pré-visualizar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /não foi possível carregar o pdf da ata/i,
    );
  });
});

describe('Atas page — manage_academic staff', () => {
  it('shows the student, guardians, and date on the grid, and approves a pending ata', async () => {
    let approved = false;

    server.use(
      http.get(apiUrl(`${BASE}/incidents`), () =>
        HttpResponse.json(page([incidentRow({ status: approved ? 'approved' : 'pending_approval' })])),
      ),
      http.post(apiUrl(`${BASE}/incidents/5/approve`), () => {
        approved = true;

        return HttpResponse.json({
          data: incidentRow({
            status: 'pending_approval',
            director_approved_at: '2026-03-11T09:00:00Z',
            director_approved_by_membership_id: 21,
          }),
        });
      }),
    );

    renderPage(directorMembership);

    const row = await screen.findByRole('row', { name: /pedro silva/i });
    expect(within(row).getByText('Mãe: Marcela Silva')).toBeInTheDocument();
    expect(within(row).getByText(/2026/)).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: /aprovar/i }));

    await waitFor(() => expect(approved).toBe(true));
  });
});

describe('Atas page — BR-IN10 author filter (manage_academic staff)', () => {
  it('sends reported_by_membership_id when a specific author is picked from the Autor select', async () => {
    const queries: URLSearchParams[] = [];

    server.use(
      http.get(apiUrl(`${BASE}/incidents`), ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json(page([]));
      }),
    );

    renderPage(directorMembership);
    await screen.findByText(/nenhuma ata registrada/i);

    await user.click(screen.getByRole('combobox', { name: /^autor$/i }));
    await user.click(await screen.findByRole('option', { name: /secretária — admin@example\.com/i }));

    await waitFor(() => {
      const last = queries[queries.length - 1];
      expect(last.get('reported_by_membership_id')).toBe('11');
    });
  });

  it('sets reported_by_membership_id to the caller\'s own membership id via "Minhas atas", and clears it on a second click', async () => {
    const queries: URLSearchParams[] = [];

    server.use(
      http.get(apiUrl(`${BASE}/incidents`), ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json(page([]));
      }),
    );

    renderPage(directorMembership);
    await screen.findByText(/nenhuma ata registrada/i);

    await user.click(screen.getByRole('button', { name: /minhas atas/i }));
    await waitFor(() => {
      const last = queries[queries.length - 1];
      expect(last.get('reported_by_membership_id')).toBe(String(directorMembership.id));
    });

    await user.click(screen.getByRole('button', { name: /minhas atas/i }));
    await waitFor(() => {
      const last = queries[queries.length - 1];
      expect(last.get('reported_by_membership_id')).toBeNull();
    });
  });

  it('hides the author filter entirely for a teacher-role caller, whose list is already their own', async () => {
    server.use(
      http.get(apiUrl(`${BASE}/preceptorship_reports/roll`), () => HttpResponse.json({ data: roll })),
      http.get(apiUrl(`${BASE}/incidents`), () => HttpResponse.json(page([]))),
    );

    renderPage(teacherMembership);
    await screen.findByText(/nenhuma ata registrada/i);

    expect(screen.queryByRole('combobox', { name: /^autor$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /minhas atas/i })).not.toBeInTheDocument();
  });
});

describe('Atas page — BR-IN11 guardian search & snapshot (manage_academic staff)', () => {
  const guardianRow = (overrides: Record<string, unknown> = {}) => ({
    id: 51,
    school_id: SCHOOL_ID,
    user_id: null,
    active: true,
    name: 'Marcela Silva',
    cpf: '11111111111',
    email: 'marcela@example.com',
    phone: '',
    zip_code: null,
    street: null,
    number: null,
    complement: null,
    neighborhood: null,
    city: null,
    state: null,
    ...overrides,
  });

  const studentRow = (overrides: Record<string, unknown> = {}) => ({
    id: 77,
    school_id: SCHOOL_ID,
    name: 'Pedro Silva',
    cpf: '33333333333',
    rg: '',
    birth_date: '2015-01-01',
    grade_level: null,
    school_class_id: 1,
    school_class_name: 'A — 2026',
    contract_active: true,
    status: 'active',
    active: true,
    guardians: [
      { id: 51, link_id: 1, name: 'Marcela Silva', cpf: '11111111111', relationship: 'mother' },
      { id: 52, link_id: 2, name: 'Carlos Silva', cpf: '22222222222', relationship: 'father' },
    ],
    ...overrides,
  });

  it('narrows the student picker by guardian name, pre-fills the checklist with relationship labels, and sends only the checked guardians', async () => {
    const studentQueries: URLSearchParams[] = [];
    const created: Record<string, unknown>[] = [];

    server.use(
      http.get(apiUrl(`${BASE}/incidents`), () => HttpResponse.json(page([]))),
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/people/guardians`), ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('student_id')) {
          return HttpResponse.json(page([guardianRow(), guardianRow({ id: 52, name: 'Carlos Silva' })]));
        }
        return HttpResponse.json(page([guardianRow()]));
      }),
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/people/students`), ({ request }) => {
        studentQueries.push(new URL(request.url).searchParams);
        return HttpResponse.json(page([studentRow()]));
      }),
      http.post(apiUrl(`${BASE}/incidents`), async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        created.push(body);
        return HttpResponse.json({ data: incidentRow() }, { status: 201 });
      }),
    );

    renderPage(directorMembership);
    await screen.findByText(/nenhuma ata registrada/i);

    await user.click(screen.getAllByRole('button', { name: /nova nota ata/i })[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.type(screen.getByRole('combobox', { name: /buscar por respons/i }), 'Marcela');
    await user.click(await screen.findByRole('option', { name: /marcela silva/i }));

    await waitFor(() => {
      const last = studentQueries[studentQueries.length - 1];
      expect(last.get('guardian_id')).toBe('51');
    });

    await user.click(screen.getByRole('combobox', { name: /^aluno$/i }));
    await user.click(await screen.findByRole('option', { name: /pedro silva/i }));

    expect(await screen.findByText('Mãe: Marcela Silva')).toBeInTheDocument();
    expect(screen.getByText('Pai: Carlos Silva')).toBeInTheDocument();

    // Drop the father from this particular ata.
    await user.click(screen.getByText('Pai: Carlos Silva'));

    await user.type(screen.getByLabelText(/pontos trazidos pelos pais/i), 'Conversa de rotina.');
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(created).toHaveLength(1));
    expect(created[0]).toMatchObject({ incident: { student_id: 77, guardian_ids: [51] } });
  });

  it('omits guardian_ids when the pre-filled checklist is never touched', async () => {
    const created: Record<string, unknown>[] = [];

    server.use(
      http.get(apiUrl(`${BASE}/incidents`), () => HttpResponse.json(page([]))),
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/people/guardians`), () =>
        HttpResponse.json(page([guardianRow(), guardianRow({ id: 52, name: 'Carlos Silva' })])),
      ),
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/people/students`), () =>
        HttpResponse.json(page([studentRow()])),
      ),
      http.post(apiUrl(`${BASE}/incidents`), async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        created.push(body);
        return HttpResponse.json({ data: incidentRow() }, { status: 201 });
      }),
    );

    renderPage(directorMembership);
    await screen.findByText(/nenhuma ata registrada/i);

    await user.click(screen.getAllByRole('button', { name: /nova nota ata/i })[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: /^aluno$/i }));
    await user.click(await screen.findByRole('option', { name: /pedro silva/i }));

    await screen.findByText('Mãe: Marcela Silva');

    await user.type(screen.getByLabelText(/pontos trazidos pelos pais/i), 'Conversa de rotina.');
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(created).toHaveLength(1));
    expect(created[0].incident).not.toHaveProperty('guardian_ids');
  });

  it('does not show the guardian search field for a teacher creating a nota ata', async () => {
    server.use(
      http.get(apiUrl(`${BASE}/preceptorship_reports/roll`), () => HttpResponse.json({ data: roll })),
      http.get(apiUrl(`${BASE}/incidents`), () => HttpResponse.json(page([]))),
    );

    renderPage(teacherMembership);
    await screen.findByText(/nenhuma ata registrada/i);

    await user.click(screen.getAllByRole('button', { name: /nova nota ata/i })[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    expect(screen.queryByRole('combobox', { name: /buscar por respons/i })).not.toBeInTheDocument();
  });
});
