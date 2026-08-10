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
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import { Charge } from 'types/charge';
import { Guardian } from 'types/guardian';
import Charges from './Charges';

const CHARGES_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/charges`;
const GUARDIANS_PATH = `/api/v1/schools/${SCHOOL_ID}/people/guardians`;
const CONTRACTS_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/contracts`;

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
  zip_code: '01310100',
  street: 'Avenida Paulista',
  number: '1000',
  complement: null,
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
};

/** A one-off the school raised outside any contract, so it answers to no student. */
const standaloneCharge: Charge = {
  id: 501,
  billing_period: '2026-09-01',
  original_amount_cents: 7_500,
  discount_amount_cents: 0,
  late_fee_amount_cents: 0,
  total_amount_cents: 7_500,
  due_date: '2026-09-15',
  status: 'pending',
  kind: 'one_off',
  description: 'Aluguel da quadra',
  boleto_url: null,
  contract_id: null,
  student: null,
  guardian: { id: 7, name: 'Maria Silva', cpf: '12345678909' },
};

const staffUser: AuthUser = {
  id: 1,
  email: 'admin@example.com',
  status: 'active',
  memberships: [
    {
      id: 1,
      school_id: SCHOOL_ID,
      school_name: 'Escola Demo',
      role: 'school',
      status: 'active',
      email: 'admin@example.com',
    },
  ],
  guardian_profiles: [],
};

const authValue: AuthContextValue = {
  user: staffUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
};

const renderPage = () => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <Charges />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

const listingHandlers = (rows: Charge[] = []) => [
  http.get(apiUrl(CHARGES_PATH), () =>
    HttpResponse.json({ data: rows, meta: { page: 1, per_page: 25, total: rows.length } }),
  ),
  http.get(apiUrl(GUARDIANS_PATH), () =>
    HttpResponse.json({ data: [maria], meta: { page: 1, per_page: 25, total: 1 } }),
  ),
  // This guardian has no contract; the form still has to let a boleto out.
  http.get(apiUrl(CONTRACTS_PATH), () =>
    HttpResponse.json({ data: [], meta: { page: 1, per_page: 25, total: 0 } }),
  ),
];

describe('Charges', () => {
  it('lists a charge that belongs to no contract without inventing a student', async () => {
    server.use(...listingHandlers([standaloneCharge]));

    renderPage();

    expect(await screen.findByText('Aluguel da quadra')).toBeInTheDocument();
    expect(screen.getByText('One-off')).toBeInTheDocument();
  });

  it('raises a one-off against a guardian who has no contract at all', async () => {
    let body: unknown;

    server.use(
      ...listingHandlers(),
      http.post(apiUrl(CHARGES_PATH), async ({ request }) => {
        body = await request.json();

        return HttpResponse.json({ data: standaloneCharge }, { status: 201 });
      }),
    );

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'New one-off boleto' }));

    const dialog = await screen.findByRole('dialog');

    // One field: type part of a name or a CPF and pick the payer from what comes back.
    await user.type(
      within(dialog).getByRole('combobox', { name: /Guardian who receives the boleto/ }),
      'Maria',
    );
    await user.click(await screen.findByRole('option', { name: /Maria Silva/ }));

    await user.type(dialog.querySelector('#charge-amount')!, '7500');
    await user.type(dialog.querySelector('#charge-due-date')!, '2026-09-15');
    await user.click(within(dialog).getByRole('button', { name: 'Issue boleto' }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({
      charge: { guardian_id: 7, contract_id: null, total_amount_cents: 7_500 },
    });
  });
  // One box over the payer's name and CPF: a secretary types what they have in front of them.
  it('searches the listing by name or CPF, and filters by status', async () => {
    const requests: URL[] = [];

    server.use(
      http.get(apiUrl(CHARGES_PATH), ({ request }) => {
        requests.push(new URL(request.url));

        return HttpResponse.json({
          data: [standaloneCharge],
          meta: { page: 1, per_page: 25, total: 1 },
        });
      }),
      ...listingHandlers([standaloneCharge]),
    );

    renderPage();
    await screen.findByText('Aluguel da quadra');

    await user.type(screen.getByRole('textbox', { name: 'Search boletos' }), '031.902');

    await waitFor(() => expect(requests[requests.length - 1]?.searchParams.get('q')).toBe('031.902'));

    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(await screen.findByRole('option', { name: 'Cancelled' }));

    await waitFor(() => expect(requests[requests.length - 1]?.searchParams.get('status')).toBe('cancelled'));
  });

  // A late boleto is an unpaid one; splitting the two would send the school looking twice.
  it('treats overdue as open', async () => {
    const requests: URL[] = [];

    server.use(
      http.get(apiUrl(CHARGES_PATH), ({ request }) => {
        requests.push(new URL(request.url));

        return HttpResponse.json({ data: [], meta: { page: 1, per_page: 25, total: 0 } });
      }),
      ...listingHandlers([standaloneCharge]),
    );

    renderPage();

    await user.click(await screen.findByRole('combobox', { name: 'Status' }));
    await user.click(await screen.findByRole('option', { name: 'Open' }));

    await waitFor(() =>
      expect(requests[requests.length - 1]?.searchParams.get('status')).toBe('pending,overdue'),
    );
  });

  // A family billed by mistake is part of the record; a row that vanished would leave the
  // mistake unexplained.
  it('cancels a boleto and keeps it on the list', async () => {
    let cancelled = false;

    server.use(
      ...listingHandlers([standaloneCharge]),
      http.post(apiUrl(`${CHARGES_PATH}/${standaloneCharge.id}/cancel`), () => {
        cancelled = true;

        return HttpResponse.json({ data: { ...standaloneCharge, status: 'cancelled' } });
      }),
    );

    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Cancel boleto for Maria Silva' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Cancel boleto' }));

    await waitFor(() => expect(cancelled).toBe(true));
    expect(await screen.findByText(/stays on the list/i)).toBeInTheDocument();
  });

  // Nothing to withdraw on a boleto that was already paid.
  it('offers no cancel action on a paid boleto', async () => {
    server.use(...listingHandlers([{ ...standaloneCharge, status: 'paid' }]));

    renderPage();
    await screen.findByText('Aluguel da quadra');

    expect(
      screen.queryByRole('button', { name: /Cancel boleto for/ }),
    ).not.toBeInTheDocument();
  });
});
