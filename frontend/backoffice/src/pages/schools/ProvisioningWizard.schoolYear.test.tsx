import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import {
  ACCESS_EXPIRES_AT,
  FRESH_ACCESS_TOKEN,
  activeSchoolYearBySchool,
  apiUrl,
  backofficeUser,
  http,
  HttpResponse,
  resetActiveSchoolYears,
  resetTeamMembershipsBySchool,
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

const renderWizard = () => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter initialEntries={[wizardPath]}>
      <AuthContext.Provider value={backofficeAuth}>
        <Routes>
          <Route path="schools/:schoolId/provisioning" element={<ProvisioningWizard />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

const advanceToBilling = async () => {
  await user.click(screen.getByRole('button', { name: /continuar/i }));
};

const advanceToSchoolYear = async () => {
  await advanceToBilling();
  await user.click(screen.getByRole('button', { name: /continuar/i }));
};

const fillSchoolYearForm = () => {
  fireEvent.change(screen.getByLabelText(/nome do ano/i), { target: { value: '2026' } });
  fireEvent.change(screen.getByLabelText(/^início$/i), { target: { value: '2026-02-01' } });
  fireEvent.change(screen.getByLabelText(/^término$/i), { target: { value: '2026-12-15' } });
};

describe('ProvisioningWizard school year step', () => {
  beforeEach(() => {
    resetTeamMembershipsBySchool();
    resetActiveSchoolYears();
  });

  it('creates and activates a school year on the Ano letivo step', async () => {
    renderWizard();

    await screen.findByRole('heading', { name: /provisionamento da escola/i });
    await advanceToSchoolYear();

    expect(await screen.findByText(/configure o primeiro ano letivo/i)).toBeInTheDocument();

    fillSchoolYearForm();
    await user.click(screen.getByRole('button', { name: /criar e ativar ano letivo/i }));

    expect(await screen.findByText(/ano letivo criado e ativado com sucesso/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(activeSchoolYearBySchool[2]?.status).toBe('active');
    });
  });

  it('shows active year summary when year already exists', async () => {
    activeSchoolYearBySchool[2] = {
      id: 50,
      school_id: 2,
      name: '2026',
      starts_on: '2026-02-01',
      ends_on: '2026-12-15',
      period_template: 'trimester',
      status: 'active',
    };

    renderWizard();
    await screen.findByRole('heading', { name: /provisionamento da escola/i });
    await advanceToSchoolYear();

    expect(await screen.findByText(/ano letivo ativo: 2026/i)).toBeInTheDocument();
  });

  it('surfaces validation errors from school year API', async () => {
    server.use(
      http.post(apiUrl('/api/v1/schools/:schoolId/school_years'), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Não foi possível salvar.',
              details: { ends_on: ['must be on or after starts_on'] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    renderWizard();
    await screen.findByRole('heading', { name: /provisionamento da escola/i });
    await advanceToSchoolYear();

    fillSchoolYearForm();
    fireEvent.change(screen.getByLabelText(/^início$/i), { target: { value: '2026-12-01' } });
    fireEvent.change(screen.getByLabelText(/^término$/i), { target: { value: '2026-02-01' } });
    await user.click(screen.getByRole('button', { name: /criar e ativar ano letivo/i }));

    expect(await screen.findByText(/não foi possível salvar/i)).toBeInTheDocument();
  });
});
