import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser, Membership } from 'types/auth';
import { CrmContact, CrmContactDetail } from 'types/crm';
import CrmContacts from './CrmContacts';

const PATH = `/api/v1/schools/${SCHOOL_ID}/crm_contacts`;

const user = userEvent.setup({ delay: null });

const enrollmentStaff: Membership = {
  ...staffMembership,
  permissions: ['manage_enrollment'],
  permission_sources: { manage_enrollment: 'template' },
};

const staffUser: AuthUser = {
  id: 1,
  email: 'admin@example.com',
  status: 'active',
  memberships: [enrollmentStaff],
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

const renderPage = (memberships: Membership[] = [enrollmentStaff]) =>
  renderWithTheme(
    <AuthContext.Provider value={authValue}>
      <CrmContacts />
    </AuthContext.Provider>,
    { memberships },
  );

const contact = (
  id: number,
  name: string,
  temperature: CrmContact['temperature'],
  extra: Partial<CrmContact> = {},
): CrmContact => ({
  id,
  name,
  phone: null,
  email: null,
  notes: null,
  temperature,
  ...extra,
});

const detail = (row: CrmContact): CrmContactDetail => ({
  ...row,
  school_id: SCHOOL_ID,
  created_at: '2026-10-14T16:40:00.000Z',
  updated_at: '2026-10-14T16:40:00.000Z',
});

const page = (rows: CrmContact[]) => ({
  data: rows,
  meta: { page: 1, per_page: 25, total: rows.length },
});

const joana = contact(1, 'Joana Prado', 'hot', {
  phone: '+55 11 98888-7777',
  email: 'joana@example.com',
  notes: 'Asked about 2027 enrollment.',
});
const marcos = contact(2, 'Marcos Lima', 'cold');
const livia = contact(3, 'Lívia Souza', 'warm');

const authenticate = () => setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

describe('CrmContacts page', () => {
  it('lists each contact with its details and temperature chip', async () => {
    authenticate();
    server.use(http.get(apiUrl(PATH), () => HttpResponse.json(page([joana, marcos, livia]))));

    renderPage();

    expect(await screen.findByText('Joana Prado')).toBeInTheDocument();
    expect(screen.getByText('+55 11 98888-7777')).toBeInTheDocument();
    expect(screen.getByText('joana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Asked about 2027 enrollment.')).toBeInTheDocument();
    expect(screen.getByText('Quente')).toBeInTheDocument();
    expect(screen.getByText('Frio')).toBeInTheDocument();
    expect(screen.getByText('Morno')).toBeInTheDocument();
  });

  it('shows the empty state with a call to action when there are no contacts', async () => {
    authenticate();
    server.use(http.get(apiUrl(PATH), () => HttpResponse.json(page([]))));

    renderPage();

    expect(await screen.findByText('Nenhum contato cadastrado')).toBeInTheDocument();
  });

  it('shows the API message when the list fails', async () => {
    authenticate();
    server.use(
      http.get(apiUrl(PATH), () =>
        HttpResponse.json(
          { error: { code: 'forbidden', message: 'Acesso negado.', details: {} } },
          { status: 403 },
        ),
      ),
    );

    renderPage();

    expect(await screen.findByText('Acesso negado.')).toBeInTheDocument();
  });

  it('does not call the API for staff without manage_enrollment', async () => {
    authenticate();
    const requested = vi.fn();
    server.use(
      http.get(apiUrl(PATH), () => {
        requested();
        return HttpResponse.json(page([joana]));
      }),
    );

    renderPage([staffMembership]);

    expect(await screen.findByText(/não tem permissão para ver os contatos/i)).toBeInTheDocument();
    expect(requested).not.toHaveBeenCalled();
  });

  it('creates a contact, defaulting the temperature to cold', async () => {
    authenticate();

    let received: unknown;
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json(page([marcos]))),
      http.post(apiUrl(PATH), async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ data: detail(contact(4, 'Ana Reis', 'cold')) }, { status: 201 });
      }),
    );

    renderPage();
    await screen.findByText('Marcos Lima');

    await user.click(screen.getByRole('button', { name: /novo contato/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/nome/i), 'Ana Reis');
    await user.type(within(dialog).getByLabelText(/telefone/i), '11 97777-6666');
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }));

    await waitFor(() =>
      expect(received).toEqual({
        crm_contact: {
          name: 'Ana Reis',
          phone: '11 97777-6666',
          email: null,
          notes: null,
          temperature: 'cold',
        },
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('requires a name before calling the API', async () => {
    authenticate();
    const created = vi.fn();
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json(page([marcos]))),
      http.post(apiUrl(PATH), () => {
        created();
        return HttpResponse.json({ data: detail(marcos) }, { status: 201 });
      }),
    );

    renderPage();
    await screen.findByText('Marcos Lima');

    await user.click(screen.getByRole('button', { name: /novo contato/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText('Informe o nome do contato.')).toBeInTheDocument();
    expect(created).not.toHaveBeenCalled();
  });

  it('shows API validation details under the matching field', async () => {
    authenticate();
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json(page([marcos]))),
      http.post(apiUrl(PATH), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Dados inválidos.',
              details: { email: ['é inválido'] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    renderPage();
    await screen.findByText('Marcos Lima');

    await user.click(screen.getByRole('button', { name: /novo contato/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/nome/i), 'Ana Reis');
    await user.type(within(dialog).getByLabelText(/e-mail/i), 'not-an-email');
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText('é inválido')).toBeInTheDocument();
  });

  it('edits a contact and reclassifies its temperature', async () => {
    authenticate();

    let received: unknown;
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json(page([marcos]))),
      http.patch(apiUrl(`${PATH}/${marcos.id}`), async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ data: detail({ ...marcos, temperature: 'hot' }) });
      }),
    );

    renderPage();
    await screen.findByText('Marcos Lima');

    await user.click(screen.getByRole('button', { name: /editar marcos lima/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/nome/i)).toHaveValue('Marcos Lima');

    await user.click(within(dialog).getByRole('combobox', { name: /classificação/i }));
    await user.click(await screen.findByRole('option', { name: 'Quente' }));
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }));

    await waitFor(() =>
      expect(received).toEqual({
        crm_contact: {
          name: 'Marcos Lima',
          phone: null,
          email: null,
          notes: null,
          temperature: 'hot',
        },
      }),
    );
  });

  it('filters by temperature through the query string', async () => {
    authenticate();

    const temperatures: Array<string | null> = [];
    server.use(
      http.get(apiUrl(PATH), ({ request }) => {
        const filter = new URL(request.url).searchParams.get('temperature');
        temperatures.push(filter);
        return HttpResponse.json(page(filter === 'hot' ? [joana] : [joana, marcos]));
      }),
    );

    renderPage();
    await screen.findByText('Marcos Lima');

    await user.click(screen.getByRole('combobox', { name: /classificação/i }));
    await user.click(await screen.findByRole('option', { name: 'Quente' }));

    await waitFor(() => expect(temperatures).toContain('hot'));
    await waitFor(() => expect(screen.queryByText('Marcos Lima')).not.toBeInTheDocument());
  });

  it('searches with the q parameter', async () => {
    authenticate();

    const queries: Array<string | null> = [];
    server.use(
      http.get(apiUrl(PATH), ({ request }) => {
        queries.push(new URL(request.url).searchParams.get('q'));
        return HttpResponse.json(page([joana]));
      }),
    );

    renderPage();
    await screen.findByText('Joana Prado');

    await user.type(screen.getByRole('textbox', { name: /buscar contatos/i }), 'joana');

    await waitFor(() => expect(queries).toContain('joana'));
  });

  it('deletes a contact after confirmation', async () => {
    authenticate();

    let deleted = false;
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json(page(deleted ? [] : [marcos]))),
      http.delete(apiUrl(`${PATH}/${marcos.id}`), () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderPage();
    await screen.findByText('Marcos Lima');

    await user.click(screen.getByRole('button', { name: /excluir marcos lima/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /excluir/i }));

    expect(await screen.findByText('Nenhum contato cadastrado')).toBeInTheDocument();
    expect(deleted).toBe(true);
  });
});
