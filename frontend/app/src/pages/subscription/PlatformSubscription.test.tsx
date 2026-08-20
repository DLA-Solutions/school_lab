import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  ACCESS_EXPIRES_AT,
  DIRECTOR_TEMPLATE_ID,
  FRESH_ACCESS_TOKEN,
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  http,
  jsonError,
  server,
  staffMembership,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser, Membership } from 'types/auth';
import { SchoolPlatformInvoice, SchoolPlatformSubscription } from 'types/platformSubscription';
import PlatformSubscriptionPage from './PlatformSubscription';

const user = userEvent.setup({ delay: null });

const directorMembership: Membership = {
  ...staffMembership,
  id: 21,
  permissions: ['manage_school_settings'],
  permission_sources: { manage_school_settings: 'owner' },
  is_owner: true,
  role_template: {
    id: DIRECTOR_TEMPLATE_ID,
    name: 'Direção',
    system_key: 'director',
    is_system: true,
  },
  display_title: 'Diretor',
};

const billingOnlyMembership: Membership = {
  ...staffMembership,
  id: 22,
  permissions: ['manage_billing'],
  permission_sources: { manage_billing: 'template' },
};

const directorUser: AuthUser = {
  id: 1,
  email: 'director@example.com',
  status: 'active',
  memberships: [directorMembership],
  guardian_profiles: [],
};

const authValue: AuthContextValue = {
  user: directorUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const activeSubscription: SchoolPlatformSubscription = {
  id: 1,
  status: 'active',
  plan_key: 'starter',
  plan_name: 'Starter',
  billing_interval: 'month',
  amount_cents: 19_900,
  current_period_start: '2026-08-01T00:00:00Z',
  current_period_end: '2026-09-01T00:00:00Z',
  trial_ends_at: null,
  cancel_at_period_end: false,
  collection_method: 'automatic',
  billing_portal_url: null,
  open_invoice: {
    id: 10,
    status: 'open',
    amount_cents: 19_900,
    due_at: '2026-08-10T00:00:00Z',
    hosted_invoice_url: 'https://www.asaas.com/i/example',
    payment_method: null,
  },
};

const openInvoice: SchoolPlatformInvoice = {
  id: 10,
  status: 'open',
  amount_cents: 19_900,
  due_at: '2026-08-10T00:00:00Z',
  paid_at: null,
  hosted_invoice_url: 'https://www.asaas.com/i/example',
  payment_method: null,
};

const subscriptionPath = `/api/v1/schools/${SCHOOL_ID}/platform_subscription`;
const plansPath = `/api/v1/schools/${SCHOOL_ID}/platform_plans`;

const authenticate = () => setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

const renderPage = (membership: Membership = directorMembership) => {
  authenticate();

  return renderWithTheme(
    <MemoryRouter>
      <AuthContext.Provider value={{ ...authValue, user: { ...directorUser, memberships: [membership] } }}>
        <PlatformSubscriptionPage />
      </AuthContext.Provider>
    </MemoryRouter>,
    { memberships: [membership] },
  );
};

describe('PlatformSubscription page', () => {
  it('hides the page from staff without manage_school_settings', async () => {
    renderPage(billingOnlyMembership);

    expect(await screen.findByText(/sem acesso a esta área/i)).toBeInTheDocument();
    expect(screen.queryByText(/gerar fatura/i)).not.toBeInTheDocument();
  });

  it('shows checkout when the school has no platform subscription', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    let checkoutBody: unknown;
    server.use(
      http.post(apiUrl(`${subscriptionPath}/checkout`), async ({ request }) => {
        checkoutBody = await request.json();
        return HttpResponse.json(
          { data: { checkout_url: 'https://www.asaas.com/i/example', billing_portal_url: null } },
          { status: 201 },
        );
      }),
    );

    renderPage();

    expect(await screen.findByText(/nenhuma assinatura school lab/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/^plano$/i));
    expect(await screen.findByRole('option', { name: /starter.*199,00/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /pro.*599,00/i })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /pro.*599,00/i }));
    await user.click(screen.getByLabelText(/periodicidade/i));
    await user.click(await screen.findByRole('option', { name: /anual.*5\.990,00/i }));
    await user.click(screen.getByRole('button', { name: /gerar fatura/i }));

    await waitFor(() => {
      expect(checkoutBody).toEqual({ plan_key: 'pro', billing_interval: 'year', trial: false });
    });
    expect(openSpy).toHaveBeenCalledWith(
      'https://www.asaas.com/i/example',
      '_blank',
      'noopener,noreferrer',
    );
    openSpy.mockRestore();
  });

  it('shows plan, interval, period and pay invoice for an active subscription', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    server.use(
      http.get(apiUrl(subscriptionPath), () => HttpResponse.json({ data: activeSubscription })),
      http.get(apiUrl(`${subscriptionPath}/invoices`), () =>
        HttpResponse.json({
          data: [openInvoice],
          meta: { page: 1, per_page: 25, total: 1 },
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Mensal')).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.queryByText(/billing_portal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/inv_/i)).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /pagar fatura/i })[0]!);
    expect(openSpy).toHaveBeenCalledWith(
      'https://www.asaas.com/i/example',
      '_blank',
      'noopener,noreferrer',
    );
    openSpy.mockRestore();
  });

  it('changes plan through the school-scoped API', async () => {
    let changeBody: unknown;
    server.use(
      http.get(apiUrl(subscriptionPath), () => HttpResponse.json({ data: activeSubscription })),
      http.get(apiUrl(`${subscriptionPath}/invoices`), () =>
        HttpResponse.json({ data: [], meta: { page: 1, per_page: 25, total: 0 } }),
      ),
      http.post(apiUrl(`${subscriptionPath}/change_plan`), async ({ request }) => {
        changeBody = await request.json();
        return HttpResponse.json({
          data: {
            ...activeSubscription,
            plan_key: 'enterprise',
            plan_name: 'Enterprise',
            billing_interval: 'year',
          },
        });
      }),
    );

    renderPage();

    await user.click(await screen.findByRole('button', { name: /trocar plano/i }));
    const dialog = await screen.findByRole('dialog', { name: /trocar plano da assinatura/i });
    await user.click(within(dialog).getByLabelText(/^plano$/i));
    await user.click(await screen.findByRole('option', { name: /enterprise.*999,00/i }));
    await user.click(within(dialog).getByLabelText(/periodicidade/i));
    await user.click(await screen.findByRole('option', { name: /anual/i }));
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(changeBody).toEqual({ plan_key: 'enterprise', billing_interval: 'year' });
    });
    expect(await screen.findByText('Enterprise')).toBeInTheDocument();
  });

  it('cancels at period end without locking the school', async () => {
    let cancelBody: unknown;
    server.use(
      http.get(apiUrl(subscriptionPath), () => HttpResponse.json({ data: activeSubscription })),
      http.get(apiUrl(`${subscriptionPath}/invoices`), () =>
        HttpResponse.json({ data: [], meta: { page: 1, per_page: 25, total: 0 } }),
      ),
      http.post(apiUrl(`${subscriptionPath}/cancel`), async ({ request }) => {
        cancelBody = await request.json();
        return HttpResponse.json({
          data: { ...activeSubscription, cancel_at_period_end: true },
        });
      }),
    );

    renderPage();

    await user.click(await screen.findByRole('button', { name: /cancelar no fim do período/i }));
    await user.click(await screen.findByRole('button', { name: /confirmar cancelamento/i }));

    await waitFor(() => {
      expect(cancelBody).toEqual({ at_period_end: true });
    });
    expect(
      await screen.findByText(/cancelamento está agendado para o fim do período/i),
    ).toBeInTheDocument();
  });

  it('loads catalog names from the API instead of hardcoded keys', async () => {
    server.use(
      http.get(apiUrl(plansPath), () =>
        HttpResponse.json({
          data: [
            {
              key: 'pro',
              name: 'Plano Escola Plus',
              intervals: [{ billing_interval: 'month', amount_cents: 12_345 }],
            },
          ],
        }),
      ),
    );

    renderPage();

    expect(await screen.findByLabelText(/^plano$/i)).toHaveTextContent(/plano escola plus/i);
    expect(screen.getByLabelText(/^plano$/i)).toHaveTextContent(/123,45/);
    expect(screen.queryByRole('option', { name: /^starter/i })).not.toBeInTheDocument();
  });

  it('shows empty catalog instead of hardcoded School Lab plan keys', async () => {
    server.use(http.get(apiUrl(plansPath), () => HttpResponse.json({ data: [] })));

    renderPage();

    expect(await screen.findByText(/nenhum plano disponível/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gerar fatura/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^starter$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^pro$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^enterprise$/i)).not.toBeInTheDocument();
  });

  it('surfaces catalog load failure on empty checkout', async () => {
    server.use(
      http.get(apiUrl(plansPath), () =>
        jsonError(500, 'internal_error', 'Falha ao carregar o catálogo.'),
      ),
    );

    renderPage();

    expect(await screen.findByText(/falha ao carregar o catálogo/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gerar fatura/i })).not.toBeInTheDocument();
  });

  it('never labels platform invoices as tuition boletos', async () => {
    server.use(
      http.get(apiUrl(subscriptionPath), () =>
        HttpResponse.json({ data: { ...activeSubscription, status: 'past_due' } }),
      ),
      http.get(apiUrl(`${subscriptionPath}/invoices`), () =>
        HttpResponse.json({
          data: [openInvoice],
          meta: { page: 1, per_page: 25, total: 1 },
        }),
      ),
    );

    renderPage();

    expect(await screen.findAllByText('Assinatura School Lab')).not.toHaveLength(0);
    expect(screen.getByText(/fatura da assinatura School Lab em atraso/i)).toBeInTheDocument();
    expect(screen.queryByText(/boleto da mensalidade/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/meus boletos/i)).not.toBeInTheDocument();
  });
});
