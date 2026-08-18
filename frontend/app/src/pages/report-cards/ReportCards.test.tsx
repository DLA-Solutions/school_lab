import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { withActiveMembership } from 'test/activeMembership';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import ReportCards from './ReportCards';

const user = userEvent.setup({ delay: null });

const academicStaffMembership = {
  ...staffMembership,
  permissions: ['manage_academic', 'manage_people'],
};

const staffUser: AuthUser = {
  id: 1,
  email: 'admin@example.com',
  status: 'active',
  memberships: [academicStaffMembership],
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

const renderPage = () => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(
    withActiveMembership([academicStaffMembership])(
      <MemoryRouter initialEntries={['/academico/boletins']}>
        <AuthContext.Provider value={authValue}>
          <ReportCards />
        </AuthContext.Provider>
      </MemoryRouter>,
    ),
  );
};

describe('ReportCards', () => {
  it('loads and saves report card configuration', async () => {
    renderPage();

    expect(await screen.findByText('Boletins')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('standard_v1')).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/cabeçalho/i));
    await user.type(screen.getByLabelText(/cabeçalho/i), 'Boletim 2026');
    await user.click(screen.getByRole('button', { name: /salvar configuração/i }));

    expect(await screen.findByText(/configuração salva/i)).toBeInTheDocument();
  });

  it('validates and publishes a class batch', async () => {
    renderPage();

    await screen.findByDisplayValue('standard_v1');
    await user.click(screen.getByRole('tab', { name: /publicar turma/i }));

    await user.click(screen.getByLabelText(/^turma$/i));
    await user.click(await screen.findByRole('option', { name: /A \(2026\)/i }));

    await user.clear(screen.getByLabelText(/id do período letivo/i));
    await user.type(screen.getByLabelText(/id do período letivo/i), '44');

    await user.click(screen.getByRole('button', { name: /^validar$/i }));
    expect(await screen.findByText(/pronto para publicar/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /publicar agora/i }));
    expect(await screen.findByText(/boletins publicados/i)).toBeInTheDocument();
    expect(screen.getByText(/estudante 1/i)).toBeInTheDocument();
  });

  it('republishes with a correction reason', async () => {
    renderPage();

    await screen.findByDisplayValue('standard_v1');
    await user.click(screen.getByRole('tab', { name: /republicar/i }));

    await user.type(screen.getByLabelText(/id da publicação/i), '801');
    await user.type(screen.getByLabelText(/motivo da correção/i), 'Nota corrigida após revisão.');
    await user.click(screen.getByRole('button', { name: /^republicar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/nova versão 2 publicada/i)).toBeInTheDocument();
    });
  });
});
