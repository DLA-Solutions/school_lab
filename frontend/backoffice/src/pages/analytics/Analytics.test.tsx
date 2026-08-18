import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT, backofficeUser } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import paths from 'routes/paths';
import Analytics from './Analytics';

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
    <MemoryRouter initialEntries={[paths.analytics]}>
      <AuthContext.Provider value={backofficeAuth}>
        <Analytics />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

describe('Analytics page', () => {
  it('shows KPI cards from analytics overview API', async () => {
    renderPage();

    expect(await screen.findByText(/escolas ativas/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$[\s\u00a0]?5\.990,00/)).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('renders date filter fields', async () => {
    renderPage();

    expect(await screen.findByLabelText(/^de$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^até$/i)).toBeInTheDocument();
  });
});
