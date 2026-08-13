import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import {
  FRESH_ACCESS_TOKEN,
  HttpResponse,
  ACCESS_EXPIRES_AT,
  apiUrl,
  backofficeUser,
  http,
  jsonError,
  sampleBankCredential,
  server,
  SECRETARY_TEMPLATE_ID,
  resetTeamMembershipsBySchool,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import paths from 'routes/paths';
import ProvisioningWizard from './ProvisioningWizard';

const PROVISIONING_SCHOOL_ID = 2;
const wizardPath = paths.provisioningWizard(PROVISIONING_SCHOOL_ID);

const user = userEvent.setup({ delay: null });

const backofficeAuth: AuthContextValue = {
  user: backofficeUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const renderWizard = (auth: AuthContextValue = backofficeAuth, initialEntry = wizardPath) => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthContext.Provider value={auth}>
        <Routes>
          <Route path="schools/:schoolId/provisioning" element={<ProvisioningWizard />} />
          <Route path={paths.schools} element={<div>Escolas</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

const advanceToBilling = async () => {
  await user.click(screen.getByRole('button', { name: /continuar/i }));
};

const advanceToPeople = async () => {
  await advanceToBilling();
  await user.click(screen.getByRole('button', { name: /continuar/i }));
};

const advanceToCsv = async () => {
  await advanceToPeople();
  await user.click(screen.getByRole('button', { name: /continuar/i }));
};

const advanceToHandoff = async () => {
  await advanceToCsv();
  await user.click(screen.getByRole('button', { name: /continuar/i }));
};

const uploadCredentialsOnBillingStep = async () => {
  await user.type(screen.getByLabelText(/client id/i), 'client-stage-001');

  const fileInputs = document.querySelectorAll('input[type="file"]');
  const certificate = new File(['cert-pem'], 'cert.pem', { type: 'application/x-pem-file' });
  const privateKey = new File(['key-pem'], 'key.pem', { type: 'application/x-pem-file' });
  await user.upload(fileInputs[0] as HTMLInputElement, certificate);
  await user.upload(fileInputs[1] as HTMLInputElement, privateKey);

  await user.click(screen.getByRole('button', { name: /enviar credenciais/i }));
};

const waitForWizardLoaded = async () => {
  await screen.findByRole('heading', { name: /provisionamento da escola/i });
};

describe('ProvisioningWizard', () => {
  beforeEach(() => {
    resetTeamMembershipsBySchool();
  });

  it('renders wizard steps for provisioning school', async () => {
    renderWizard();

    await waitForWizardLoaded();
    expect(screen.getByRole('heading', { name: /^boas-vindas$/i })).toBeInTheDocument();
    expect(screen.getAllByText(/escola beta/i).length).toBeGreaterThan(0);
  });

  it('renders wizard page sections in vertical column layout', async () => {
    renderWizard();
    await waitForWizardLoaded();

    const root = screen.getByTestId('provisioning-wizard');
    expect(root).toHaveStyle({ flexDirection: 'column' });

    const pageTitle = screen.getByRole('heading', { name: /provisionamento da escola/i });
    const stepTitle = screen.getByRole('heading', { name: /^boas-vindas$/i });
    const stepper = root.querySelector('.MuiStepper-root');
    const stepCard = stepTitle.closest('.MuiPaper-root');

    expect(stepper).not.toBeNull();
    expect(stepCard).not.toBeNull();
    expect(
      pageTitle.compareDocumentPosition(stepper as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      (stepper as Node).compareDocumentPosition(stepCard as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('navigates through billing and people steps', async () => {
    renderWizard();
    await waitForWizardLoaded();

    await advanceToBilling();
    expect(screen.getByText(/adiar configuração de cobrança/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText(/convide membros da equipe administrativa/i)).toBeInTheDocument();
  });

  it('sends team invite on people step and shows it in the list', async () => {
    let invitePayload: Record<string, unknown> | null = null;

    server.use(
      http.post(apiUrl('/api/v1/schools/:schoolId/people/memberships'), async ({ request }) => {
        invitePayload = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            data: {
              id: 201,
              status: 'invited',
              role: 'staff',
              display_title: 'Secretária',
            },
          },
          { status: 201 },
        );
      }),
    );

    renderWizard();
    await waitForWizardLoaded();
    await advanceToPeople();

    await user.type(screen.getByLabelText(/^e-mail$/i), 'secretaria@example.com');
    await user.click(screen.getByRole('button', { name: /^enviar convite$/i }));

    await waitFor(() => {
      expect(invitePayload).not.toBeNull();
    });

    expect(invitePayload).toEqual({
      membership: {
        email: 'secretaria@example.com',
        role: 'staff',
        role_template_id: SECRETARY_TEMPLATE_ID,
      },
    });
    expect(await screen.findByText(/convite enviado com sucesso/i)).toBeInTheDocument();
    expect(screen.getByText('secretaria@example.com')).toBeInTheDocument();
    expect(screen.getByText('secretaria@example.com').closest('li')).toHaveTextContent('Secretária');
  });

  it('resends staff invite on people step', async () => {
    let resendCalled = false;

    server.use(
      http.post(apiUrl('/api/v1/schools/:schoolId/people/memberships/:id/invite'), ({ params }) => {
        resendCalled = true;
        expect(params.id).not.toBe('50');

        return HttpResponse.json({
          data: {
            id: Number(params.id),
            school_id: PROVISIONING_SCHOOL_ID,
            role: 'staff',
            status: 'invited',
            email: 'secretaria@example.com',
            is_owner: false,
            display_title: 'Secretária',
            role_template: {
              id: SECRETARY_TEMPLATE_ID,
              name: 'Secretária',
              system_key: 'secretary',
              is_system: true,
            },
          },
        });
      }),
    );

    renderWizard();
    await waitForWizardLoaded();
    await advanceToPeople();

    await user.type(screen.getByLabelText(/^e-mail$/i), 'secretaria@example.com');
    await user.click(screen.getByRole('button', { name: /^enviar convite$/i }));
    await screen.findByText(/convite enviado com sucesso/i);

    const staffRow = screen.getByText('secretaria@example.com').closest('li');
    expect(staffRow).not.toBeNull();
    await user.click(within(staffRow as HTMLElement).getByRole('button', { name: /^reenviar convite$/i }));

    await waitFor(() => {
      expect(resendCalled).toBe(true);
    });
    expect(await screen.findByText(/convite reenviado com sucesso/i)).toBeInTheDocument();
  });

  it('resends owner invite on people step', async () => {
    let resendCalled = false;

    server.use(
      http.post(apiUrl('/api/v1/schools/:schoolId/people/memberships/:id/invite'), ({ params }) => {
        resendCalled = true;
        expect(params.id).toBe('50');

        return HttpResponse.json({
          data: {
            id: 50,
            school_id: PROVISIONING_SCHOOL_ID,
            role: 'staff',
            status: 'invited',
            email: 'diretor@example.com',
            is_owner: true,
            display_title: 'Diretor',
            role_template: {
              id: 102,
              name: 'Direção',
              system_key: 'director',
              is_system: true,
            },
          },
        });
      }),
    );

    renderWizard();
    await waitForWizardLoaded();
    await advanceToPeople();

    expect(screen.getByText('diretor@example.com')).toBeInTheDocument();
    const ownerRow = screen.getByText('diretor@example.com').closest('li');
    expect(ownerRow).not.toBeNull();
    await user.click(within(ownerRow as HTMLElement).getByRole('button', { name: /^reenviar convite$/i }));

    await waitFor(() => {
      expect(resendCalled).toBe(true);
    });
    expect(await screen.findByText(/convite reenviado com sucesso/i)).toBeInTheDocument();
  });

  it('shows team invite indicator on handoff step after sending invite', async () => {
    renderWizard();
    await waitForWizardLoaded();
    await advanceToPeople();

    await user.type(screen.getByLabelText(/^e-mail$/i), 'secretaria@example.com');
    await user.click(screen.getByRole('button', { name: /^enviar convite$/i }));
    await screen.findByText(/convite enviado com sucesso/i);

    await user.click(screen.getByRole('button', { name: /continuar/i }));
    await user.click(screen.getByRole('button', { name: /continuar/i }));

    expect(screen.getByText(/convite da equipe enviado \(opcional\)/i)).toBeInTheDocument();
  });

  it('allows skipping team invite on people step', async () => {
    renderWizard();
    await waitForWizardLoaded();
    await advanceToPeople();

    await user.click(screen.getByRole('button', { name: /continuar/i }));

    expect(screen.getByText(/envie um arquivo csv/i)).toBeInTheDocument();
    expect(screen.queryByText(/convite da equipe enviado/i)).not.toBeInTheDocument();
  });

  it('previews CSV with dry_run then commits import', async () => {
    let previewCalled = false;
    let commitCalled = false;

    server.use(
      http.post(apiUrl('/api/v1/schools/:schoolId/provisioning/import'), ({ request }) => {
        const url = new URL(request.url);
        const dryRun = url.searchParams.get('dry_run') !== 'false';
        if (dryRun) {
          previewCalled = true;
        } else {
          commitCalled = true;
        }

        return HttpResponse.json({
          data: {
            import: {
              id: 501,
              status: dryRun ? 'previewed' : 'committed',
              row_count: 2,
              committed_at: dryRun ? null : '2026-08-10T12:00:00Z',
              created_at: '2026-08-10T12:00:00Z',
              error_report: null,
            },
            summary: {
              valid_rows: 2,
              students_to_create: 2,
              guardians_to_create: 2,
              links_to_create: 2,
            },
          },
        });
      }),
    );

    renderWizard();
    await waitForWizardLoaded();
    await advanceToCsv();

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    const file = new File(['student_name\nAna'], 'families.csv', { type: 'text/csv' });
    await user.upload(fileInput as HTMLInputElement, file);

    await user.click(screen.getByRole('button', { name: /pré-visualizar/i }));

    await waitFor(() => {
      expect(previewCalled).toBe(true);
    });
    expect(screen.getByText(/pré-visualização concluída/i)).toBeInTheDocument();
    expect(screen.getByText(/linhas válidas: 2/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirmar importação/i }));

    await waitFor(() => {
      expect(commitCalled).toBe(true);
    });
    expect(screen.getByText(/importação concluída com sucesso/i)).toBeInTheDocument();
  });

  it('shows validation errors from CSV preview', async () => {
    server.use(
      http.post(apiUrl('/api/v1/schools/:schoolId/provisioning/import'), () =>
        jsonError(422, 'import_validation_failed', 'Não foi possível processar o CSV.', {
          error_report: {
            rows: [{ row: 2, errors: { student_name: ['não pode ficar em branco'] } }],
          },
        }),
      ),
    );

    renderWizard();
    await waitForWizardLoaded();
    await advanceToCsv();

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['bad'], 'invalid.csv', { type: 'text/csv' });
    await user.upload(fileInput as HTMLInputElement, file);
    await user.click(screen.getByRole('button', { name: /pré-visualizar/i }));

    expect(await screen.findByText(/erros de validação/i)).toBeInTheDocument();
    expect(screen.getByText(/linha 2, student_name/i)).toBeInTheDocument();
  });

  it('completes provisioning handoff and navigates to schools', async () => {
    renderWizard();
    await waitForWizardLoaded();

    await advanceToBilling();
    await user.click(screen.getByRole('checkbox', { name: /adiar configuração de cobrança/i }));
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    await user.click(screen.getByRole('button', { name: /continuar/i }));

    await user.click(screen.getByRole('button', { name: /confirmar repasse ao responsável/i }));

    await waitFor(() => {
      expect(screen.getByText('Escolas')).toBeInTheDocument();
    });
  });

  it('blocks handoff when billing is not deferred', async () => {
    renderWizard();
    await waitForWizardLoaded();
    await advanceToHandoff();

    expect(screen.getByRole('button', { name: /confirmar repasse ao responsável/i })).toBeDisabled();
    expect(
      screen.getByText(/configure as credenciais cora ou adie a cobrança/i),
    ).toBeInTheDocument();
  });

  it('uploads bank credentials on billing step', async () => {
    renderWizard();
    await waitForWizardLoaded();
    await advanceToBilling();

    await uploadCredentialsOnBillingStep();

    expect(await screen.findByText(/credenciais enviadas com sucesso/i)).toBeInTheDocument();
    expect(screen.getByText(/client id: client-stage-001/i)).toBeInTheDocument();
    expect(screen.getByText(/impressão digital/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /adiar configuração de cobrança/i })).toBeDisabled();
  });

  it('shows validation errors from credential upload', async () => {
    server.use(
      http.post(apiUrl('/api/v1/schools/:schoolId/bank_credentials'), () =>
        jsonError(422, 'validation_error', 'Não foi possível salvar.', {
          certificate: ['is invalid'],
        }),
      ),
    );

    renderWizard();
    await waitForWizardLoaded();
    await advanceToBilling();

    await user.type(screen.getByLabelText(/client id/i), 'client-stage-001');

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const certificate = new File(['bad'], 'invalid.pem', { type: 'application/x-pem-file' });
    const privateKey = new File(['key-pem'], 'key.pem', { type: 'application/x-pem-file' });
    await user.upload(fileInputs[0] as HTMLInputElement, certificate);
    await user.upload(fileInputs[1] as HTMLInputElement, privateKey);

    await user.click(screen.getByRole('button', { name: /enviar credenciais/i }));

    expect(await screen.findByText(/erros de validação/i)).toBeInTheDocument();
    expect(screen.getByText(/certificado: is invalid/i)).toBeInTheDocument();
  });

  it('shows existing credentials on billing step load', async () => {
    server.use(
      http.get(apiUrl('/api/v1/schools/:schoolId/bank_credentials'), () =>
        HttpResponse.json({ data: [sampleBankCredential(PROVISIONING_SCHOOL_ID, 'client-existing')] }),
      ),
    );

    renderWizard();
    await waitForWizardLoaded();
    await advanceToBilling();

    expect(await screen.findByText(/credenciais cora ativas configuradas/i)).toBeInTheDocument();
    expect(screen.getByText(/client id: client-existing/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enviar credenciais/i })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /adiar configuração de cobrança/i })).toBeDisabled();
  });

  it('completes handoff with uploaded credentials without waiving billing', async () => {
    renderWizard();
    await waitForWizardLoaded();

    await advanceToBilling();
    await uploadCredentialsOnBillingStep();
    await screen.findByText(/credenciais enviadas com sucesso/i);

    await user.click(screen.getByRole('button', { name: /continuar/i }));
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    await user.click(screen.getByRole('button', { name: /continuar/i }));

    expect(screen.getByRole('button', { name: /confirmar repasse ao responsável/i })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /confirmar repasse ao responsável/i }));

    await waitFor(() => {
      expect(screen.getByText('Escolas')).toBeInTheDocument();
    });
  });

  it('shows read-only state for active school', async () => {
    server.use(
      http.get(apiUrl('/api/v1/schools/:schoolId'), () =>
        HttpResponse.json({
          data: {
            id: 1,
            name: 'Escola Alpha',
            cnpj: null,
            address: null,
            saas_plan: null,
            school_group_id: null,
            onboarding_status: 'active',
            onboarding_mode: 'white_glove',
          },
        }),
      ),
    );

    renderWizard(backofficeAuth, paths.provisioningWizard(1));

    expect(await screen.findByText(/provisionamento encerrado/i)).toBeInTheDocument();
    expect(screen.getByText(/já está ativa/i)).toBeInTheDocument();
  });

});
