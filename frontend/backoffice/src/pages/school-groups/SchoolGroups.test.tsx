import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  FRESH_ACCESS_TOKEN,
  ACCESS_EXPIRES_AT,
  backofficeUser,
  sampleSchoolGroups,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import paths from 'routes/paths';
import SchoolGroups from './SchoolGroups';

const user = userEvent.setup({ delay: null });

const backofficeAuth: AuthContextValue = {
  user: backofficeUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const renderPage = () => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter initialEntries={[paths.schoolGroups]}>
      <AuthContext.Provider value={backofficeAuth}>
        <SchoolGroups />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

describe('SchoolGroups page', () => {
  it('lists school groups from the API', async () => {
    renderPage();

    expect(await screen.findByText('Rede ABC')).toBeInTheDocument();
    expect(screen.getByText('Grupo Norte')).toBeInTheDocument();
    expect(screen.getByText(String(sampleSchoolGroups[0]!.schools_count))).toBeInTheDocument();
  });

  it('opens create dialog from header action', async () => {
    renderPage();

    await user.click(await screen.findByRole('button', { name: /novo grupo/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
  });
});
