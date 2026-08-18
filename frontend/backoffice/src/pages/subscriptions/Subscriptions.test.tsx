import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import {
  FRESH_ACCESS_TOKEN,
  ACCESS_EXPIRES_AT,
  backofficeUser,
  sampleSubscriptions,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import paths from 'routes/paths';
import Subscriptions from './Subscriptions';

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
    <MemoryRouter initialEntries={[paths.subscriptions]}>
      <AuthContext.Provider value={backofficeAuth}>
        <Subscriptions />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

describe('Subscriptions page', () => {
  it('lists subscriptions with plan and school from the API', async () => {
    renderPage();

    expect(await screen.findByText(sampleSubscriptions[0]!.school!.name)).toBeInTheDocument();
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText(/ativa/i)).toBeInTheDocument();
  });
});
