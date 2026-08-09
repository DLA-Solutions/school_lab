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
    expect(screen.getByText('Avulso')).toBeInTheDocument();
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

    await user.click(await screen.findByRole('button', { name: 'Novo boleto avulso' }));

    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('combobox', { name: /Responsável/ }));
    await user.click(await screen.findByRole('option', { name: /Maria Silva/ }));

    await user.type(dialog.querySelector('#charge-amount')!, '7500');
    await user.type(dialog.querySelector('#charge-due-date')!, '2026-09-15');
    await user.click(within(dialog).getByRole('button', { name: 'Gerar boleto' }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({
      charge: { guardian_id: 7, contract_id: null, total_amount_cents: 7_500 },
    });
  });
});
