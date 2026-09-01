import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, guardianMembership, http, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { withActiveMembership } from 'test/activeMembership';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import MyReportCards from './MyReportCards';

const user = userEvent.setup({ delay: null });

const guardianUser: AuthUser = {
  id: 2,
  email: 'guardian@example.com',
  status: 'active',
  memberships: [guardianMembership],
  guardian_profiles: [{ id: 5 }],
};

const authValue: AuthContextValue = {
  user: guardianUser,
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
    withActiveMembership([guardianMembership])(
      <MemoryRouter initialEntries={['/boletins']}>
        <AuthContext.Provider value={authValue}>
          <MyReportCards />
        </AuthContext.Provider>
      </MemoryRouter>,
    ),
  );
};

describe('MyReportCards', () => {
  it('lists released report cards for linked children', async () => {
    renderPage();

    expect(await screen.findByText('Boletins')).toBeInTheDocument();
    expect(await screen.findByText('Pedro Silva')).toBeInTheDocument();
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /baixar pdf/i })).toHaveLength(2);
  });

  it('filters by child', async () => {
    renderPage();

    await screen.findByText('Pedro Silva');
    await user.click(screen.getByLabelText(/filho/i));
    await user.click(screen.getByRole('option', { name: 'Pedro Silva' }));

    await waitFor(() => {
      expect(screen.getAllByText('Pedro Silva').length).toBeGreaterThan(0);
      expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
    });
  });

  it('opens detail metadata for a publication', async () => {
    renderPage();

    await screen.findByText('Pedro Silva');
    await user.click(screen.getAllByRole('button', { name: /ver detalhes/i })[0]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/detalhes do boletim/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/estudante: pedro silva/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/período letivo: 44/i)).toBeInTheDocument();
  });

  it('shows empty state when the family has no released cards', async () => {
    server.use(
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/me/report_cards`), () =>
        HttpResponse.json({
          data: [],
          meta: { page: 1, per_page: 25, total: 0 },
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText(/nenhum boletim ainda/i)).toBeInTheDocument();
    expect(screen.getByText('Boletins')).toBeInTheDocument();
    expect(screen.getByText('Seus boletins')).toBeInTheDocument();
    expect(
      screen.getByText(/quando a escola liberar um boletim para a sua família/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('∅')).not.toBeInTheDocument();

    const title = screen.getByText(/nenhum boletim ainda/i);
    const copyStack = title.closest('.MuiStack-root');
    expect(copyStack).toHaveStyle({ flexDirection: 'column' });
    expect(copyStack?.parentElement).toHaveStyle({ flexDirection: 'column' });
  });
});
