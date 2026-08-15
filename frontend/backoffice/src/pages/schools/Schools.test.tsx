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

const renderPage = (
  auth: AuthContextValue = backofficeAuth,
  initialEntry: string = paths.schools,
) => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter initialEntries={[initialEntry]}>
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
  it('lists schools with onboarding status and mode columns', async () => {
    server.use(http.get(apiUrl(SCHOOLS_PATH), () => HttpResponse.json(page(sampleSchools))));

    renderPage();

    expect(await screen.findByText('Escola Alpha')).toBeInTheDocument();
    expect(screen.getByText('Escola Beta')).toBeInTheDocument();
    expect(screen.getAllByText('Ativa')).toHaveLength(1);
    expect(screen.getByText('Em provisionamento')).toBeInTheDocument();
    expect(screen.getAllByText('Autoatendimento')).toHaveLength(1);
    expect(screen.getAllByText('Premium (white-glove)')).toHaveLength(2);
  });

  it('filters schools by onboarding status and mode together', async () => {
    const requests: string[] = [];

    server.use(
      http.get(apiUrl(SCHOOLS_PATH), ({ request }) => {
        requests.push(request.url);
        const url = new URL(request.url);
        const status = url.searchParams.get('onboarding_status');
        const mode = url.searchParams.get('onboarding_mode');
        const rows = sampleSchools.filter(
          (school) =>
            (!status || school.onboarding_status === status) &&
            (!mode || school.onboarding_mode === mode),
        );

        return HttpResponse.json(page(rows));
      }),
    );

    renderPage();

    await screen.findByText('Escola Alpha');

    await user.click(screen.getByLabelText(/^status$/i));
    await user.click(await screen.findByRole('option', { name: /aguardando repasse/i }));

    await user.click(screen.getByLabelText(/^modo$/i));
    await user.click(await screen.findByRole('option', { name: /premium/i }));

    await waitFor(() => {
      expect(screen.getByText('Escola Gama')).toBeInTheDocument();
      expect(screen.queryByText('Escola Alpha')).not.toBeInTheDocument();
      expect(screen.queryByText('Escola Beta')).not.toBeInTheDocument();
    });

    expect(requests.some((url) => url.includes('onboarding_status=pending_handoff'))).toBe(true);
    expect(requests.some((url) => url.includes('onboarding_mode=white_glove'))).toBe(true);
  });

  it('initializes filters from onboarding_status query params', async () => {
    const requests: string[] = [];

    server.use(
      http.get(apiUrl(SCHOOLS_PATH), ({ request }) => {
        requests.push(request.url);
        const url = new URL(request.url);
        const status = url.searchParams.get('onboarding_status');
        const rows = status
          ? sampleSchools.filter((school) => school.onboarding_status === status)
          : sampleSchools;

        return HttpResponse.json(page(rows));
      }),
    );

    renderPage(backofficeAuth, paths.schoolsWithOnboardingStatus('provisioning'));

    await waitFor(() => {
      expect(screen.getByText('Escola Beta')).toBeInTheDocument();
      expect(screen.queryByText('Escola Alpha')).not.toBeInTheDocument();
    });

    expect(requests.some((url) => url.includes('onboarding_status=provisioning'))).toBe(true);
  });

  it('offers continue provisioning for white-glove provisioning schools', async () => {
    server.use(http.get(apiUrl(SCHOOLS_PATH), () => HttpResponse.json(page(sampleSchools))));

    renderPage();

    const link = await screen.findByRole('link', {
      name: /continuar provisionamento de escola beta/i,
    });

    expect(link).toHaveAttribute('href', paths.provisioningWizard(2));
  });

  // A certificate expires, so credentials stay reachable long after provisioning is finished —
  // on every school, not only the ones still being set up.
  // The school is a party to its own contracts, and signs under its CNPJ from this address.
  it('saves the address the school signs contracts from', async () => {
    let received: { school: Record<string, unknown> } | undefined;
    server.use(
      http.get(apiUrl(SCHOOLS_PATH), () => HttpResponse.json(page(sampleSchools))),
      http.post(apiUrl(SCHOOLS_PATH), async ({ request }) => {
        received = (await request.json()) as { school: Record<string, unknown> };
        return HttpResponse.json({ data: sampleSchools[0] }, { status: 201 });
      }),
    );

    renderPage();

    const dialog = await openCreateForm();
    await user.type(within(dialog).getByLabelText(/^nome/i), 'Colégio Exemplo');
    await user.type(within(dialog).getByLabelText(/e-mail do responsável/i), 'director@example.com');
    await user.type(
      within(dialog).getByLabelText(/e-mail de assinatura/i),
      'colegionsrgo@gmail.com',
    );
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(received).toBeDefined());
    expect(received?.school.signature_email).toBe('colegionsrgo@gmail.com');
  });

  it('links every school to its bank credentials', async () => {
    server.use(http.get(apiUrl(SCHOOLS_PATH), () => HttpResponse.json(page(sampleSchools))));

    renderPage();

    const link = await screen.findByRole('link', {
      name: /credenciais bancárias de escola gama/i,
    });

    expect(link).toHaveAttribute('href', paths.bankCredentials(3));
  });

  it('shows pending handoff activation affordance distinct from provisioning action', async () => {
    server.use(http.get(apiUrl(SCHOOLS_PATH), () => HttpResponse.json(page(sampleSchools))));

    renderPage();

    await screen.findByText('Escola Gama');

    const activationLink = screen.getByRole('link', {
      name: /ativar escola gama/i,
    });
    expect(activationLink).toHaveAttribute('href', paths.schoolActivation(3));
    expect(
      screen.queryByRole('link', { name: /continuar provisionamento de escola gama/i }),
    ).not.toBeInTheDocument();
  });

  it('shows platform-operator empty state copy', async () => {
    server.use(http.get(apiUrl(SCHOOLS_PATH), () => HttpResponse.json(page([]))));

    renderPage();

    expect(await screen.findByText('Nenhuma escola cadastrada')).toBeInTheDocument();
    expect(
      screen.getByText(/ainda não há escolas registradas na plataforma/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/administrador dela/i)).not.toBeInTheDocument();
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
            meta: {
              owner_invite_email_status: 'queued',
            },
          },
          { status: 201 },
        );
      }),
    );

    renderPage();
    await screen.findByText('Nenhuma escola cadastrada');

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
          signature_email: null,
        },
      }),
    );

    expect(await screen.findByText('Escola criada')).toBeInTheDocument();
    expect(screen.getByText(/e-mail com o link de ativação foi enviado ao responsável/i)).toBeInTheDocument();
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
    await screen.findByText('Nenhuma escola cadastrada');

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
    await screen.findByText('Nenhuma escola cadastrada');

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
    await screen.findByText('Nenhuma escola cadastrada');

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
