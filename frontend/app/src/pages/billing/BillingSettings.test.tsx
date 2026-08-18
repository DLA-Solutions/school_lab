import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import { BillingSettings } from 'types/billingSettings';
import BillingSettingsPage from './BillingSettings';

const PATH = `/api/v1/schools/${SCHOOL_ID}/billing/settings`;

const user = userEvent.setup({ delay: null });

const settings: BillingSettings = {
  school_id: SCHOOL_ID,
  overdue_grace_days: 3,
  service_description: 'Mensalidade escolar',
  notification_schedule: { reminders: [{ days_before_due: 3 }] },
  interest_rate_percent: 1.0,
  early_payment_discount_percent: null,
  fine_type: null,
  fine_rate_percent: null,
  fine_amount_cents: null,
  persisted: true,
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

const renderPage = () =>
  renderWithTheme(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <BillingSettingsPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

const authenticate = () => setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

describe('BillingSettingsPage', () => {
  it('shows the page subtitle under the title', async () => {
    authenticate();
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json({ data: settings })),
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/bank_credentials`), () =>
        HttpResponse.json({ data: [] }),
      ),
    );

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText(/parâmetros enviados ao banco na emissão de boletos/i),
      ).toBeInTheDocument(),
    );
  });

  it('loads billing settings into the form', async () => {
    authenticate();
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json({ data: settings })),
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/bank_credentials`), () =>
        HttpResponse.json({ data: [] }),
      ),
    );

    renderPage();

    await waitFor(() =>
      expect(screen.getByLabelText(/descrição do serviço no boleto/i)).toHaveValue(
        settings.service_description,
      ),
    );
    expect(screen.getByLabelText(/taxa de mora mensal/i)).toHaveValue('1');
  });

  it('saves updated settings', async () => {
    authenticate();
    let patched = false;

    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json({ data: settings })),
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/bank_credentials`), () =>
        HttpResponse.json({ data: [] }),
      ),
      http.patch(apiUrl(PATH), async ({ request }) => {
        patched = true;
        const body = (await request.json()) as { billing_settings: Record<string, unknown> };
        expect(body.billing_settings.early_payment_discount_percent).toBe(5);
        return HttpResponse.json({
          data: {
            ...settings,
            early_payment_discount_percent: 5,
          },
        });
      }),
    );

    renderPage();

    await waitFor(() =>
      expect(screen.getByLabelText(/desconto por pontualidade/i)).toBeInTheDocument(),
    );

    await user.clear(screen.getByLabelText(/desconto por pontualidade/i));
    await user.type(screen.getByLabelText(/desconto por pontualidade/i), '5');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(patched).toBe(true));
    expect(screen.getByText(/configurações salvas/i)).toBeInTheDocument();
  });

  it('shows validation errors from the API', async () => {
    authenticate();

    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json({ data: settings })),
      http.patch(apiUrl(PATH), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Validation failed',
              details: { fine_rate_percent: ["can't be blank"] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    renderPage();

    await waitFor(() => expect(screen.getByLabelText(/multa em percentual/i)).toBeInTheDocument());
    await user.click(screen.getByLabelText(/multa em percentual/i));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(screen.getByText(/revise os campos/i)).toBeInTheDocument());
  });
});
