import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import { GuardianRequest } from 'types/guardianRequest';
import Requests from './Requests';

const BASE = `/api/v1/schools/${SCHOOL_ID}/requests`;

const user = userEvent.setup({ delay: null });

const declaration: GuardianRequest = {
  id: 1,
  school_id: SCHOOL_ID,
  kind: 'declaration',
  status: 'pending',
  details: 'Declaração de matrícula para o empregador.',
  reference_date: null,
  resolution_note: null,
  resolved_at: null,
  created_at: '2026-08-10T12:00:00Z',
  updated_at: '2026-08-10T12:00:00Z',
  guardian_id: 5,
  student_id: 9,
  subject_id: null,
  guardian_name: 'Maria Silva',
  student_name: 'Pedro Silva',
  subject_name: null,
};

const secondCall: GuardianRequest = {
  ...declaration,
  id: 2,
  kind: 'second_call',
  details: 'Faltou por consulta médica.',
  reference_date: '2026-05-12',
  subject_id: 7,
  subject_name: 'Matemática',
};

interface Acted {
  action: string;
  body: Record<string, unknown>;
}

const stub = (rows: GuardianRequest[] = [declaration, secondCall]) => {
  const queries: string[] = [];
  const acted: Acted[] = [];

  server.use(
    http.get(apiUrl(BASE), ({ request }) => {
      queries.push(new URL(request.url).search);
      return HttpResponse.json({
        data: rows,
        meta: { page: 1, per_page: 25, total: rows.length },
      });
    }),
    http.post(apiUrl(`${BASE}/:id/:action`), async ({ params, request }) => {
      acted.push({
        action: String(params.action),
        body: (await request.json()) as Record<string, unknown>,
      });
      return HttpResponse.json({ data: declaration });
    }),
  );

  return { queries, acted };
};

const staffUser: AuthUser = {
  id: 1,
  email: 'admin@example.com',
  status: 'active',
  memberships: [{ ...staffMembership, permissions: ['manage_documents'] }],
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
    <MemoryRouter initialEntries={['/solicitacoes']}>
      <AuthContext.Provider value={authValue}>
        <Requests />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

// The grid is the heaviest thing either of these specs renders, and under a loaded suite it can
// take longer than the default one second to put its rows up. The wait is generous so a slow
// machine reads as slow rather than as broken.
const GRID_TIMEOUT = { timeout: 5000 };

const openFirstRequest = async () => {
  const buttons = await screen.findAllByRole('button', { name: /abrir/i }, GRID_TIMEOUT);
  await user.click(buttons[0]);

  return screen.findByRole('dialog', undefined, GRID_TIMEOUT);
};

describe('Solicitações queue', () => {
  it('lists what families asked for, naming the child', async () => {
    stub();
    renderPage();

    expect(await screen.findByText('Declaração', undefined, GRID_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByText('Segunda chamada')).toBeInTheDocument();
    expect(screen.getAllByText('Pedro Silva').length).toBeGreaterThan(0);
  });

  // The only reason to come here is to clear work, so the screen opens on the work.
  it('opens on what is still outstanding', async () => {
    const { queries } = stub();
    renderPage();

    await waitFor(() => expect(queries.length).toBeGreaterThan(0));
    expect(queries[0]).toContain('status=open');
  });

  it('narrows to one kind', async () => {
    const { queries } = stub();
    renderPage();

    await screen.findByText('Declaração', undefined, GRID_TIMEOUT);
    await user.click(screen.getByLabelText(/tipo/i));
    await user.click(await screen.findByRole('option', { name: 'Segunda chamada' }));

    await waitFor(() => expect(queries.join(' ')).toContain('kind=second_call'));
  });

  it('claims a request so nobody else picks it up', async () => {
    const { acted } = stub();
    renderPage();

    const dialog = await openFirstRequest();
    await user.click(within(dialog).getByRole('button', { name: /assumir/i }));

    await waitFor(() => expect(acted.map((entry) => entry.action)).toContain('start'));
  });

  // A guardian told "no" will ask why, and whoever fields that call needs the reason.
  it('will not let a refusal go out with no reason', async () => {
    stub();
    renderPage();

    const dialog = await openFirstRequest();

    expect(within(dialog).getByRole('button', { name: /recusar/i })).toBeDisabled();
  });

  it('sends the reason it was refused for', async () => {
    const { acted } = stub();
    renderPage();

    const dialog = await openFirstRequest();
    await user.type(
      within(dialog).getByLabelText(/resposta da escola/i),
      'Documento já emitido em março.',
    );
    await user.click(within(dialog).getByRole('button', { name: /recusar/i }));

    await waitFor(() => expect(acted.length).toBeGreaterThan(0));
    expect(acted[0]).toMatchObject({
      action: 'reject',
      body: { resolution_note: 'Documento já emitido em março.' },
    });
  });

  // A request already answered is history: the answer is shown, not an answer box.
  it('shows the answer rather than the box once it is answered', async () => {
    stub([
      {
        ...declaration,
        status: 'rejected',
        resolution_note: 'Documento já emitido em março.',
        resolved_at: '2026-08-11T12:00:00Z',
      },
    ]);
    renderPage();

    const dialog = await openFirstRequest();

    expect(within(dialog).getByText(/documento já emitido em março/i)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /recusar/i })).not.toBeInTheDocument();
  });
});
