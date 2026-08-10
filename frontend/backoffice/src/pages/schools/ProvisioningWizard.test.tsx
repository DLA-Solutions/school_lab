import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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
  server,
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

const waitForWizardLoaded = async () => {
  await screen.findByRole('heading', { name: /provisionamento da escola/i });
};

describe('ProvisioningWizard', () => {
  it('renders wizard steps for provisioning school', async () => {
    renderWizard();

    await waitForWizardLoaded();
    expect(screen.getByRole('heading', { name: /^boas-vindas$/i })).toBeInTheDocument();
    expect(screen.getAllByText(/escola beta/i).length).toBeGreaterThan(0);
  });

  it('navigates through billing and people steps', async () => {
    renderWizard();
    await waitForWizardLoaded();

    await advanceToBilling();
    expect(screen.getByText(/adiar configuração de cobrança/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText(/importados em lote/i)).toBeInTheDocument();
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
