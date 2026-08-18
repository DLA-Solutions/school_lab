import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import {
  ACCESS_EXPIRES_AT,
  FRESH_ACCESS_TOKEN,
  backofficeUser,
  modulesBySchool,
  resetModulesBySchool,
  sampleSchools,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import paths from 'routes/paths';
import SchoolDetail from './SchoolDetail';

const SCHOOL_ID = 3;
const detailPath = paths.schoolDetail(SCHOOL_ID);

const user = userEvent.setup({ delay: null });

const backofficeAuth: AuthContextValue = {
  user: backofficeUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const renderDetail = () => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter initialEntries={[detailPath]}>
      <AuthContext.Provider value={backofficeAuth}>
        <Routes>
          <Route path="schools/:schoolId" element={<SchoolDetail />} />
          <Route path={paths.schools} element={<div>Escolas</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

describe('SchoolDetail', () => {
  beforeEach(() => {
    resetModulesBySchool();
  });

  it('renders tenant profile with module chips and aggregate counts', async () => {
    renderDetail();

    expect(await screen.findByTestId('school-detail')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: sampleSchools[2]!.name })).toBeInTheDocument();
    expect(screen.getByText(/30/)).toBeInTheDocument();
    expect(screen.getByText(/cobrança: desativado/i)).toBeInTheDocument();
  });

  it('toggles a module and shows success feedback', async () => {
    renderDetail();

    const billingSwitch = await screen.findByRole('switch', { name: /cobrança/i });
    expect(billingSwitch).not.toBeChecked();

    await user.click(billingSwitch);

    await waitFor(() => {
      expect(modulesBySchool[SCHOOL_ID]?.billing).toBe(true);
    });
    expect(await screen.findByText(/módulos atualizados com sucesso/i)).toBeInTheDocument();
  });

  it('shows quick links for provisioning schools', async () => {
    renderDetail();

    expect(await screen.findByRole('link', { name: /ativação/i })).toHaveAttribute(
      'href',
      paths.schoolActivation(SCHOOL_ID),
    );
    expect(screen.getByRole('link', { name: /credenciais bancárias/i })).toHaveAttribute(
      'href',
      paths.bankCredentials(SCHOOL_ID),
    );
  });
});
