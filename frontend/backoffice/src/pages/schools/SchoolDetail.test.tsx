import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import {
  ACCESS_EXPIRES_AT,
  FRESH_ACCESS_TOKEN,
  backofficeOpsUser,
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

const backofficeOpsAuth: AuthContextValue = {
  user: backofficeOpsUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const renderDetail = (auth: AuthContextValue = backofficeAuth) => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter initialEntries={[detailPath]}>
      <AuthContext.Provider value={auth}>
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

  it('hides impersonation controls without manage_backoffice_ops', async () => {
    renderDetail(backofficeAuth);

    expect(await screen.findByTestId('school-detail')).toBeInTheDocument();
    expect(screen.queryByTestId('impersonation-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('impersonation-header-action')).not.toBeInTheDocument();
  });

  it('shows impersonation controls for manage_backoffice_ops operators', async () => {
    renderDetail(backofficeOpsAuth);

    expect(await screen.findByTestId('impersonation-section')).toBeInTheDocument();
    expect(screen.getByTestId('impersonation-header-action')).toBeInTheDocument();
    expect(screen.getByText(/suporte dla/i)).toBeInTheDocument();
  });

  it('starts impersonation from the school detail dialog', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderDetail(backofficeOpsAuth);

    await user.click(await screen.findByTestId('impersonation-header-action'));
    const dialog = await screen.findByRole('dialog');
    const staffSelect = within(dialog).getByRole('combobox');
    await user.click(staffSelect);
    await user.click(await screen.findByRole('option', { name: /diretor/i }));

    const confirmButton = within(dialog).getByRole('button', { name: /abrir escola/i });
    await waitFor(() => {
      expect(confirmButton).not.toBeDisabled();
    });

    await user.click(confirmButton);

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining('impersonation_token=impersonation-access-token'),
        '_blank',
        'noopener,noreferrer',
      );
    });

    expect(await screen.findByTestId('active-impersonation')).toBeInTheDocument();
    openSpy.mockRestore();
  });
});
