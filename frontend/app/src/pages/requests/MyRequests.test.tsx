import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, guardianMembership, http, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { withActiveMembership } from 'test/activeMembership';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import { GuardianRequest } from 'types/guardianRequest';
import MyRequests from './MyRequests';

const BASE = `/api/v1/schools/${SCHOOL_ID}/me`;

const user = userEvent.setup({ delay: null });

const mine: GuardianRequest = {
  id: 1,
  school_id: SCHOOL_ID,
  kind: 'declaration',
  status: 'rejected',
  details: 'Declaração de matrícula para o empregador.',
  reference_date: null,
  resolution_note: 'Documento já emitido em março.',
  resolved_at: '2026-08-11T12:00:00Z',
  created_at: '2026-08-10T12:00:00Z',
  updated_at: '2026-08-11T12:00:00Z',
  guardian_id: 5,
  student_id: 9,
  subject_id: null,
  guardian_name: 'Maria Silva',
  student_name: 'Pedro Silva',
  subject_name: null,
};

const stub = ({
  rows = [mine],
  students = [{ id: 9, name: 'Pedro Silva' }],
}: {
  rows?: GuardianRequest[];
  students?: { id: number; name: string }[];
} = {}) => {
  const sent: Record<string, unknown>[] = [];

  server.use(
    http.get(apiUrl(`${BASE}/students`), () =>
      HttpResponse.json({
        data: students,
        meta: { page: 1, per_page: 25, total: students.length },
      }),
    ),
    http.get(apiUrl(`${BASE}/requests`), () =>
      HttpResponse.json({ data: rows, meta: { page: 1, per_page: 25, total: rows.length } }),
    ),
    http.post(apiUrl(`${BASE}/requests`), async ({ request }) => {
      sent.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json({ data: mine }, { status: 201 });
    }),
  );

  return sent;
};

const guardianUser: AuthUser = {
  id: 2,
  email: 'guardian@example.com',
  status: 'active',
  memberships: [guardianMembership],
  guardian_profiles: [{ id: 5 }],
};

const authValue: AuthContextValue = {
  user: guardianUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const renderPage = () => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(
    withActiveMembership([guardianMembership])(
      <MemoryRouter initialEntries={['/meus-pedidos']}>
        <AuthContext.Provider value={authValue}>
          <MyRequests />
        </AuthContext.Provider>
      </MemoryRouter>,
    ),
  );
};

describe('A guardian’s requests', () => {
  it('lists what was asked for, with the school’s answer', async () => {
    stub();
    renderPage();

    expect(await screen.findByText(/declaração de matrícula/i)).toBeInTheDocument();
    expect(screen.getByText(/documento já emitido em março/i)).toBeInTheDocument();
    expect(screen.getByText('Recusada')).toBeInTheDocument();
  });

  // One child is the common case, and making that guardian pick from a list of one is asking a
  // question whose answer is already known.
  it('picks the only child for them', async () => {
    stub();
    renderPage();

    await waitFor(() =>
      expect(screen.getByLabelText(/aluno/i)).toHaveTextContent('Pedro Silva'),
    );
  });

  it('leaves the choice open when there is more than one child', async () => {
    stub({
      students: [
        { id: 9, name: 'Pedro Silva' },
        { id: 10, name: 'Ana Silva' },
      ],
    });
    renderPage();

    await screen.findByText(/declaração de matrícula/i);
    // MUI renders a zero-width space in an empty select, so this asks that neither child was
    // chosen rather than that the node is literally empty.
    const chooser = screen.getByLabelText(/aluno/i);
    expect(chooser).not.toHaveTextContent('Pedro Silva');
    expect(chooser).not.toHaveTextContent('Ana Silva');
  });

  it('sends a declaration', async () => {
    const sent = stub();
    renderPage();

    await waitFor(() =>
      expect(screen.getByLabelText(/aluno/i)).toHaveTextContent('Pedro Silva'),
    );
    await user.type(screen.getByLabelText(/pedido/i), 'Preciso para o trabalho');
    await user.click(screen.getByRole('button', { name: /enviar pedido/i }));

    await waitFor(() => expect(sent.length).toBe(1));
    expect(sent[0]).toMatchObject({
      guardian_request: {
        student_id: 9,
        kind: 'declaration',
        details: 'Preciso para o trabalho',
      },
    });
  });

  // Nothing gates which kind may be asked for: whether the school can grant a second sitting is
  // the school's answer to give, not the form's.
  it('sends a second sitting with the date of the test', async () => {
    const sent = stub();
    renderPage();

    await waitFor(() =>
      expect(screen.getByLabelText(/aluno/i)).toHaveTextContent('Pedro Silva'),
    );

    await user.click(screen.getByLabelText(/tipo/i));
    await user.click(await screen.findByRole('option', { name: 'Segunda chamada' }));

    const date = screen.getByLabelText(/data da prova/i);
    await user.clear(date);
    await user.type(date, '2026-05-12');
    await user.type(screen.getByLabelText(/pedido/i), 'Faltou por consulta médica');
    await user.click(screen.getByRole('button', { name: /enviar pedido/i }));

    await waitFor(() => expect(sent.length).toBe(1));
    expect(sent[0]).toMatchObject({
      guardian_request: {
        kind: 'second_call',
        reference_date: '2026-05-12',
        details: 'Faltou por consulta médica',
      },
    });
  });

  it('will not send a request with nothing written in it', async () => {
    stub();
    renderPage();

    await waitFor(() =>
      expect(screen.getByLabelText(/aluno/i)).toHaveTextContent('Pedro Silva'),
    );

    expect(screen.getByRole('button', { name: /enviar pedido/i })).toBeDisabled();
  });
});
