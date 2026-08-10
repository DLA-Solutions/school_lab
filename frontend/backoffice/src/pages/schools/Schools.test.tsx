import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  HttpResponse,
  FRESH_ACCESS_TOKEN,
  ACCESS_EXPIRES_AT,
  apiUrl,
  backofficeUser,
  http,
  jsonError,
  sampleSchools,
  server,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import paths from 'routes/paths';
import Schools from './Schools';

const SCHOOLS_PATH = '/api/v1/schools';

const user = userEvent.setup({ delay: null });

const backofficeAuth: AuthContextValue = {
  user: backofficeUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const page = (rows: typeof sampleSchools) => ({
  data: rows,
  meta: { page: 1, per_page: 25, total: rows.length },
});

const renderPage = (auth: AuthContextValue = backofficeAuth) => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter initialEntries={[paths.schools]}>
      <AuthContext.Provider value={auth}>
        <Schools />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

const openCreateForm = async () => {
  const buttons = await screen.findAllByRole('button', { name: /nova escola/i });
  await user.click(buttons[0]!);
  return screen.findByRole('dialog');
};

describe('Schools page', () => {
  it('lists schools from the API', async () => {
    server.use(http.get(apiUrl(SCHOOLS_PATH), () => HttpResponse.json(page(sampleSchools))));

    renderPage();

    expect(await screen.findByText('Escola Alpha')).toBeInTheDocument();
    expect(screen.getByText('Escola Beta')).toBeInTheDocument();
  });

  it('creates a self-serve school with owner email and shows pending_handoff confirmation', async () => {
    let received: unknown;
    server.use(
      http.get(apiUrl(SCHOOLS_PATH), () => HttpResponse.json(page([]))),
      http.post(apiUrl(SCHOOLS_PATH), async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(
          {
            data: {
              id: 10,
              name: 'Nova Escola',
              cnpj: null,
              address: null,
              saas_plan: null,
              school_group_id: null,
              onboarding_mode: 'self_serve',
              onboarding_status: 'pending_handoff',
            },
          },
          { status: 201 },
        );
      }),
    );

    renderPage();
    await screen.findByText('Nenhuma escola');

    const dialog = await openCreateForm();
    await user.type(within(dialog).getByLabelText(/^nome/i), 'Nova Escola');
    await user.type(within(dialog).getByLabelText(/e-mail do responsável/i), 'director@example.com');
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }));

    await waitFor(() =>
      expect(received).toEqual({
        school: {
          name: 'Nova Escola',
          cnpj: null,
          address: null,
          saas_plan: null,
          onboarding_mode: 'self_serve',
          owner_email: 'director@example.com',
        },
      }),
    );

    expect(await screen.findByText('Escola criada')).toBeInTheDocument();
    expect(screen.getByText(/convite foi enviado ao responsável/i)).toBeInTheDocument();
    expect(screen.getByText('Aguardando repasse')).toBeInTheDocument();
  });

  it('creates a white-glove school and offers the provisioning wizard link', async () => {
    server.use(
      http.get(apiUrl(SCHOOLS_PATH), () => HttpResponse.json(page([]))),
      http.post(apiUrl(SCHOOLS_PATH), async ({ request }) => {
        const body = (await request.json()) as { school?: { onboarding_mode?: string } };
        expect(body.school?.onboarding_mode).toBe('white_glove');

        return HttpResponse.json(
          {
            data: {
              id: 11,
              name: 'Escola Premium',
              cnpj: null,
              address: null,
              saas_plan: null,
              school_group_id: null,
              onboarding_mode: 'white_glove',
              onboarding_status: 'provisioning',
            },
          },
          { status: 201 },
        );
      }),
    );

    renderPage();
    await screen.findByText('Nenhuma escola');

    const dialog = await openCreateForm();
    await user.type(within(dialog).getByLabelText(/^nome/i), 'Escola Premium');
    await user.click(within(dialog).getByLabelText(/modo de onboarding/i));
    await user.click(await screen.findByRole('option', { name: /premium/i }));
    await user.type(
      within(dialog).getByLabelText(/e-mail do responsável/i),
      'director@premium.example',
    );
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText('Em provisionamento')).toBeInTheDocument();

    const wizardLink = screen.getByRole('link', { name: /ir para provisionamento/i });
    expect(wizardLink).toHaveAttribute('href', paths.provisioningWizard(11));
  });

  it('shows client validation when owner email is missing', async () => {
    server.use(http.get(apiUrl(SCHOOLS_PATH), () => HttpResponse.json(page([]))));

    renderPage();
    await screen.findByText('Nenhuma escola');

    const dialog = await openCreateForm();
    await user.type(within(dialog).getByLabelText(/^nome/i), 'Sem responsável');
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }));

    expect(await within(dialog).findByText('Informe o e-mail do responsável.')).toBeInTheDocument();
  });

  it('maps API validation errors to form fields', async () => {
    server.use(
      http.get(apiUrl(SCHOOLS_PATH), () => HttpResponse.json(page([]))),
      http.post(apiUrl(SCHOOLS_PATH), () =>
        jsonError(422, 'validation_error', 'Dados inválidos.', {
          owner_email: ['não é válido'],
          cnpj: ['não é válido'],
        }),
      ),
    );

    renderPage();
    await screen.findByText('Nenhuma escola');

    const dialog = await openCreateForm();

    await user.type(within(dialog).getByLabelText(/^nome/i), 'Escola Inválida');
    await user.type(within(dialog).getByLabelText(/e-mail do responsável/i), 'invalid');
    await user.type(within(dialog).getByLabelText(/^cnpj/i), '123');
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(within(dialog).getAllByText('não é válido')).toHaveLength(2);
    });
  });
});
