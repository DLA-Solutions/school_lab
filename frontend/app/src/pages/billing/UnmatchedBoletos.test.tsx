import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import {
  ACCESS_EXPIRES_AT,
  FRESH_ACCESS_TOKEN,
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
import { AuthUser } from 'types/auth';
import { Guardian } from 'types/guardian';
import { UnmatchedBoleto } from 'types/charge';
import UnmatchedBoletos from './UnmatchedBoletos';

const UNMATCHED_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/unmatched_boletos`;
const GUARDIANS_PATH = `/api/v1/schools/${SCHOOL_ID}/people/guardians`;

const user = userEvent.setup({ delay: null });

const maria: Guardian = {
  id: 7,
  school_id: SCHOOL_ID,
  user_id: null,
  active: true,
  name: 'Maria Silva',
  cpf: '12345678909',
  email: 'maria@example.com',
  phone: '+55 11 99999-0000',
  zip_code: null,
  street: null,
  number: null,
  complement: null,
  neighborhood: null,
  city: null,
  state: null,
};

const pendingRow: UnmatchedBoleto = {
  id: 301,
  school_id: SCHOOL_ID,
  provider: 'inter',
  provider_invoice_id: 'INV-301',
  payer_cpf: '98765432100',
  payer_name: 'Mariana Silvaa',
  amount_cents: 45_000,
  due_date: '2026-09-15',
  provider_status: 'open',
  status: 'pending',
  resolved_at: null,
  resolved_guardian_id: null,
  charge_id: null,
  created_at: '2026-09-01T10:00:00Z',
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

const renderPage = () => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <UnmatchedBoletos />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

const listingHandlers = (rows: UnmatchedBoleto[] = []) => [
  http.get(apiUrl(UNMATCHED_PATH), ({ request }) => {
    const status = new URL(request.url).searchParams.get('status') ?? 'pending';
    const filtered = rows.filter((row) => row.status === status);

    return HttpResponse.json({
      data: filtered,
      meta: { page: 1, per_page: 25, total: filtered.length },
    });
  }),
  http.get(apiUrl(GUARDIANS_PATH), () =>
    HttpResponse.json({ data: [maria], meta: { page: 1, per_page: 25, total: 1 } }),
  ),
];

describe('UnmatchedBoletos', () => {
  it('lists a pending row with the payer the bank reported, the amount, due date and bank status', async () => {
    server.use(...listingHandlers([pendingRow]));

    renderPage();

    expect(await screen.findByText('Mariana Silvaa')).toBeInTheDocument();
    expect(screen.getByText('CPF 987.654.321-00')).toBeInTheDocument();
    expect(screen.getByText('R$ 450,00')).toBeInTheDocument();
    expect(screen.getByText('Em aberto')).toBeInTheDocument();
  });

  it('shows the empty state when there is nothing pending', async () => {
    server.use(...listingHandlers([]));

    renderPage();

    expect(await screen.findByText('Nenhum boleto pendente de vínculo')).toBeInTheDocument();
  });

  it('links a pending boleto to the guardian picked from the search', async () => {
    let resolvedBody: unknown;

    server.use(
      ...listingHandlers([pendingRow]),
      http.post(apiUrl(`${UNMATCHED_PATH}/${pendingRow.id}/resolve`), async ({ request }) => {
        resolvedBody = await request.json();

        return HttpResponse.json({
          data: { ...pendingRow, status: 'resolved', resolved_guardian_id: 7, charge_id: 900 },
        });
      }),
    );

    renderPage();

    await user.click(await screen.findByRole('button', { name: /Vincular boleto de/ }));

    const dialog = await screen.findByRole('dialog');
    await user.type(
      within(dialog).getByRole('combobox', { name: 'Responsável correto' }),
      'Maria',
    );
    await user.click(await screen.findByRole('option', { name: /Maria Silva/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Vincular' }));

    await waitFor(() => expect(resolvedBody).toEqual({ guardian_id: 7 }));
    expect(await screen.findByText('Boleto vinculado a Maria Silva.')).toBeInTheDocument();
  });

  it('requires a guardian before submitting the link', async () => {
    server.use(...listingHandlers([pendingRow]));

    renderPage();

    await user.click(await screen.findByRole('button', { name: /Vincular boleto de/ }));
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: 'Vincular' }));

    expect(await within(dialog).findByText('Selecione o responsável.')).toBeInTheDocument();
  });

  it('reports a conflict when the row was already resolved or dismissed elsewhere, and refreshes the list', async () => {
    server.use(
      ...listingHandlers([pendingRow]),
      http.post(apiUrl(`${UNMATCHED_PATH}/${pendingRow.id}/resolve`), () =>
        HttpResponse.json(
          {
            error: {
              code: 'invalid_state_transition',
              message: 'Estado inválido.',
              details: {},
            },
          },
          { status: 409 },
        ),
      ),
    );

    renderPage();

    await user.click(await screen.findByRole('button', { name: /Vincular boleto de/ }));
    const dialog = await screen.findByRole('dialog');
    await user.type(
      within(dialog).getByRole('combobox', { name: 'Responsável correto' }),
      'Maria',
    );
    await user.click(await screen.findByRole('option', { name: /Maria Silva/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Vincular' }));

    expect(
      await screen.findByText('Este boleto já foi resolvido ou descartado por outra pessoa. A lista foi atualizada.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('dismisses a boleto after confirming, which is not reversible from here', async () => {
    let dismissed = false;

    server.use(
      ...listingHandlers([pendingRow]),
      http.post(apiUrl(`${UNMATCHED_PATH}/${pendingRow.id}/dismiss`), () => {
        dismissed = true;

        return HttpResponse.json({ data: { ...pendingRow, status: 'dismissed' } });
      }),
    );

    renderPage();

    await user.click(await screen.findByRole('button', { name: /Descartar boleto de/ }));
    await user.click(await screen.findByRole('button', { name: 'Descartar' }));

    await waitFor(() => expect(dismissed).toBe(true));
    expect(await screen.findByText('Boleto descartado.')).toBeInTheDocument();
  });

  it('switches to the resolved queue through the status filter, which offers no action', async () => {
    const resolvedRow: UnmatchedBoleto = {
      ...pendingRow,
      id: 302,
      payer_name: 'Joana Pereira',
      status: 'resolved',
      resolved_guardian_id: 7,
      charge_id: 901,
    };

    server.use(...listingHandlers([pendingRow, resolvedRow]));

    renderPage();
    await screen.findByText('Mariana Silvaa');

    await user.click(screen.getByRole('combobox', { name: 'Situação' }));
    await user.click(await screen.findByRole('option', { name: 'Vinculados' }));

    expect(await screen.findByText('Joana Pereira')).toBeInTheDocument();
    expect(screen.queryByText('Mariana Silvaa')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Vincular boleto de/ })).not.toBeInTheDocument();
  });
});
