import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import { PreceptorshipReport } from 'types/preceptorshipReport';
import Preceptorship from './Preceptorship';

const BASE = `/api/v1/schools/${SCHOOL_ID}/academics/preceptorship_reports`;

const user = userEvent.setup({ delay: null });

const draft: PreceptorshipReport = {
  id: 1,
  school_id: SCHOOL_ID,
  status: 'draft',
  body: 'Pedro tem participado bem das aulas.',
  published_at: null,
  created_at: '2026-08-10T12:00:00Z',
  updated_at: '2026-08-10T12:00:00Z',
  student_id: 9,
  teacher_id: 3,
  academic_period_id: null,
  student_name: 'Pedro Silva',
  teacher_name: 'Carla Souza',
  period_name: null,
  editable: true,
};

const publishedReport: PreceptorshipReport = {
  ...draft,
  id: 2,
  status: 'published',
  published_at: '2026-08-11T12:00:00Z',
  editable: false,
};

interface Sent {
  method: string;
  body: Record<string, unknown> | null;
  path: string;
}

const stub = (rows: PreceptorshipReport[] = [draft]) => {
  const sent: Sent[] = [];

  server.use(
    http.get(apiUrl(`${BASE}/roll`), () =>
      HttpResponse.json({
        data: [{ id: 9, name: 'Pedro Silva', school_class_name: '5º ano A · Manhã — 2026' }],
      }),
    ),
    http.get(apiUrl(BASE), () =>
      HttpResponse.json({ data: rows, meta: { page: 1, per_page: 25, total: rows.length } }),
    ),
    http.post(apiUrl(BASE), async ({ request }) => {
      sent.push({
        method: 'POST',
        path: BASE,
        body: (await request.json()) as Record<string, unknown>,
      });
      return HttpResponse.json({ data: draft }, { status: 201 });
    }),
    http.put(apiUrl(`${BASE}/:id`), async ({ request, params }) => {
      sent.push({
        method: 'PUT',
        path: String(params.id),
        body: (await request.json()) as Record<string, unknown>,
      });
      return HttpResponse.json({ data: draft });
    }),
    http.post(apiUrl(`${BASE}/:id/publish`), ({ params }) => {
      sent.push({ method: 'PUBLISH', path: String(params.id), body: null });
      return HttpResponse.json({ data: publishedReport });
    }),
  );

  return sent;
};

const teacherUser: AuthUser = {
  id: 1,
  email: 'carla@example.com',
  status: 'active',
  memberships: [{ ...staffMembership, role: 'teacher', permissions: ['teach'] }],
  guardian_profiles: [],
};

const authValue: AuthContextValue = {
  user: teacherUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const renderPage = () => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(
    <MemoryRouter initialEntries={['/academico/preceptoria']}>
      <AuthContext.Provider value={authValue}>
        <Preceptorship />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

describe('Preceptorship, as the teacher writes it', () => {
  it('offers the students this teacher may write about', async () => {
    stub();
    renderPage();

    await user.click(await screen.findByLabelText(/aluno/i));
    expect(await screen.findByRole('option', { name: /pedro silva/i })).toBeInTheDocument();
  });

  it('saves what was typed as a draft', async () => {
    const sent = stub();
    renderPage();

    await user.click(await screen.findByLabelText(/aluno/i));
    await user.click(await screen.findByRole('option', { name: /pedro silva/i }));
    await user.type(screen.getByLabelText(/relatório/i), 'Vai muito bem em leitura.');
    await user.click(screen.getByRole('button', { name: /salvar rascunho/i }));

    await waitFor(() => expect(sent.length).toBe(1));
    expect(sent[0]).toMatchObject({
      method: 'POST',
      body: { preceptorship_report: { student_id: 9, body: 'Vai muito bem em leitura.' } },
    });
  });

  it('will not save an empty report', async () => {
    stub();
    renderPage();

    await screen.findByText('Pedro tem participado bem das aulas.');
    expect(screen.getByRole('button', { name: /salvar rascunho/i })).toBeDisabled();
  });

  // A teacher works on a paragraph over several sittings; carrying on writes into the same draft
  // rather than starting a second one about the same child.
  it('carries on with an existing draft rather than starting another', async () => {
    const sent = stub();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /continuar escrevendo/i }));

    const box = screen.getByLabelText(/relatório/i);
    expect(box).toHaveValue('Pedro tem participado bem das aulas.');

    await user.type(box, ' Melhorou muito.');
    await user.click(screen.getByRole('button', { name: /salvar rascunho/i }));

    await waitFor(() => expect(sent.length).toBe(1));
    expect(sent[0].method).toBe('PUT');
  });

  // Which child a report is about is settled when it is started.
  it('will not let the student be changed once writing has begun', async () => {
    stub();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /continuar escrevendo/i }));

    expect(screen.getByLabelText(/aluno/i)).toHaveAttribute('aria-disabled', 'true');
  });

  // Publishing cannot be undone, so it is asked about rather than done on a single click.
  it('asks before handing the report to the family', async () => {
    const sent = stub();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^publicar$/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/não pode ser editado nem retirado/i)).toBeInTheDocument();
    expect(sent).toHaveLength(0);

    await user.click(within(dialog).getByRole('button', { name: /^publicar$/i }));

    await waitFor(() => expect(sent.map((entry) => entry.method)).toContain('PUBLISH'));
  });

  // A published report is the school's record of what a family was told.
  it('offers no way to edit or discard a published report', async () => {
    stub([publishedReport]);
    renderPage();

    await screen.findByText('Publicado');
    expect(screen.queryByRole('button', { name: /continuar escrevendo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /descartar/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /baixar pdf/i })).toBeInTheDocument();
  });
});
