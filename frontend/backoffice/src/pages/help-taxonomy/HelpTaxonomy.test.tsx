import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT, backofficeUser } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import paths from 'routes/paths';
import HelpTaxonomy from './HelpTaxonomy';

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
    <MemoryRouter initialEntries={[paths.helpTaxonomy]}>
      <AuthContext.Provider value={backofficeAuth}>
        <HelpTaxonomy />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

describe('HelpTaxonomy page', () => {
  it('lists taxonomy categories from the API', async () => {
    renderPage();

    expect(await screen.findByText('Financeiro')).toBeInTheDocument();
    expect(screen.getAllByText('Comunicação').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Secretária').length).toBeGreaterThan(0);
  });

  it('opens create dialog with persona tag checkboxes', async () => {
    renderPage();

    await user.click(await screen.findByRole('button', { name: /nova categoria/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Secretária');
    expect(dialog).toHaveTextContent('Direção');
  });
});
