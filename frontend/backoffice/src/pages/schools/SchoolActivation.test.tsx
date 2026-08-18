import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import {
  FRESH_ACCESS_TOKEN,
  HttpResponse,
  ACCESS_EXPIRES_AT,
  apiUrl,
  backofficeUser,
  bankCredentialsBySchool,
  http,
  jsonError,
  sampleBankCredential,
  sampleSchools,
  server,
  teamMembershipsBySchool,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import paths from 'routes/paths';
import SchoolActivation from './SchoolActivation';

const PENDING_HANDOFF_SCHOOL_ID = 3;
const activationPath = paths.schoolActivation(PENDING_HANDOFF_SCHOOL_ID);

const user = userEvent.setup({ delay: null });

const backofficeAuth: AuthContextValue = {
  user: backofficeUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const renderActivation = (initialEntry = activationPath) => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthContext.Provider value={backofficeAuth}>
        <Routes>
          <Route path="schools/:schoolId/activation" element={<SchoolActivation />} />
          <Route path={paths.schools} element={<div>Escolas</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

const useActiveBankCredentials = () => {
  bankCredentialsBySchool[PENDING_HANDOFF_SCHOOL_ID] = [
    sampleBankCredential(PENDING_HANDOFF_SCHOOL_ID, 'client-activation'),
  ];
};

describe('SchoolActivation', () => {
  beforeEach(() => {
    useActiveBankCredentials();
    teamMembershipsBySchool[3] = [
      {
        id: 63,
        school_id: 3,
        school_name: 'Escola Gama',
        role: 'staff',
        status: 'active',
        email: 'diretor@example.com',
        role_template: {
          id: 102,
          name: 'Direção',
          system_key: 'director',
          is_system: true,
        },
        is_owner: true,
        segment_id: null,
        display_title: 'Diretor',
        permissions: [],
        permission_sources: {},
      },
    ];
  });

  it('loads activation checklist for pending_handoff white-glove school', async () => {
    renderActivation();

    expect(await screen.findByText(/checklist de ativação/i)).toBeInTheDocument();
    expect(screen.getByText(/proprietário com acesso ativo/i)).toBeInTheDocument();
    expect(screen.getByText(/cobrança configurada ou adiada/i)).toBeInTheDocument();
    expect(screen.getByText(/ano letivo ativo configurado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar e ativar escola/i })).toBeEnabled();
  });

  it('completes activation and navigates to schools', async () => {
    renderActivation();

    await screen.findByRole('button', { name: /confirmar e ativar escola/i });
    await user.click(screen.getByRole('button', { name: /confirmar e ativar escola/i }));

    await waitFor(() => {
      expect(screen.getByText('Escolas')).toBeInTheDocument();
    });
  });

  it('surfaces checklist errors from activation API', async () => {
    server.use(
      http.post(apiUrl('/api/v1/schools/:schoolId/handoff'), () =>
        jsonError(422, 'validation_error', 'Checklist incompleta.', {
          checklist: ['owner_active'],
        }),
      ),
    );

    renderActivation();

    await user.click(await screen.findByRole('button', { name: /confirmar e ativar escola/i }));

    expect(await screen.findByText(/itens pendentes/i)).toBeInTheDocument();
    expect(screen.getAllByText(/proprietário com acesso ativo/i).length).toBeGreaterThan(0);
  });

  it('shows self-serve monitoring copy without activate button', async () => {
    const selfServeSchool = {
      ...sampleSchools[2],
      onboarding_mode: 'self_serve' as const,
    };

    server.use(
      http.get(apiUrl('/api/v1/schools/:schoolId'), () =>
        HttpResponse.json({ data: selfServeSchool }),
      ),
    );

    renderActivation(paths.schoolActivation(selfServeSchool.id));

    expect(
      await screen.findByText(/escolas em autoatendimento são ativadas pelo responsável/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirmar e ativar escola/i })).not.toBeInTheDocument();
  });

  it('blocks activation when owner invite is pending', async () => {
    teamMembershipsBySchool[3] = [
      {
        ...teamMembershipsBySchool[3][0],
        status: 'invited',
      },
    ];

    renderActivation();

    expect(await screen.findByText(/convite pendente/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar e ativar escola/i })).toBeDisabled();
  });
});
