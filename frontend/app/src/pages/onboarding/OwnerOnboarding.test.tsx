import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import {
  FRESH_ACCESS_TOKEN,
  HttpResponse,
  ACCESS_EXPIRES_AT,
  apiUrl,
  http,
  ownerPendingMembership,
  ownerPendingUser,
  server,
  staffUser,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import OwnerOnboarding from './OwnerOnboarding';
import paths, { rootPaths } from 'routes/paths';

const user = userEvent.setup({ delay: null });

const ownerAuth: AuthContextValue = {
  user: ownerPendingUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn().mockResolvedValue({
    ...ownerPendingUser,
    memberships: [{ ...ownerPendingMembership, school_onboarding_status: 'active' }],
  }),
};

const renderWizard = (auth: AuthContextValue = ownerAuth) => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter initialEntries={[paths.ownerOnboarding]}>
      <AuthContext.Provider value={auth}>
        <Routes>
          <Route path={paths.ownerOnboarding} element={<OwnerOnboarding />} />
          <Route path={rootPaths.root} element={<div>Dashboard</div>} />
          <Route path={paths.dashboard} element={<div>Dashboard</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

const advanceToBilling = async () => {
  await user.click(screen.getByRole('button', { name: /continuar/i }));
};

const advanceToSegments = async () => {
  await advanceToBilling();
  await user.click(screen.getByRole('button', { name: /continuar/i }));
};

const advanceToTeam = async () => {
  await advanceToSegments();
  await user.click(screen.getByRole('button', { name: /continuar/i }));
};

const advanceToHandoff = async () => {
  await advanceToTeam();
  await user.click(screen.getByRole('button', { name: /pular/i }));
};

describe('OwnerOnboarding', () => {
  it('renders wizard steps for pending-handoff owner', () => {
    renderWizard();

    expect(screen.getByRole('heading', { name: /configuração da escola/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^boas-vindas$/i })).toBeInTheDocument();
    expect(screen.getAllByText(/example school/i).length).toBeGreaterThan(0);
  });

  it('navigates through wizard steps', async () => {
    renderWizard();

    await advanceToBilling();
    expect(screen.getByText(/adiar configuração de cobrança/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText(/configurar segmentos depois/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByLabelText(/e-mail da secretária/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /pular/i }));
    expect(screen.getByRole('button', { name: /confirmar e ativar escola/i })).toBeDisabled();
  });

  it('completes handoff and navigates to dashboard', async () => {
    renderWizard();

    await advanceToBilling();
    await user.click(screen.getByRole('checkbox', { name: /adiar configuração de cobrança/i }));
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    await user.click(screen.getByRole('button', { name: /pular/i }));

    await user.click(screen.getByRole('button', { name: /confirmar e ativar escola/i }));

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
    expect(ownerAuth.refreshUser).toHaveBeenCalled();
  });

  it('disables confirm when billing is not deferred', async () => {
    renderWizard();
    await advanceToHandoff();

    expect(screen.getByRole('button', { name: /confirmar e ativar escola/i })).toBeDisabled();
  });

  it('surfaces checklist errors from handoff API', async () => {
    server.use(
      http.post(apiUrl('/api/v1/schools/:schoolId/handoff'), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Checklist incompleta.',
              details: { checklist: ['billing'] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    renderWizard();
    await advanceToBilling();
    await user.click(screen.getByRole('checkbox', { name: /adiar configuração de cobrança/i }));
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    await user.click(screen.getByRole('button', { name: /pular/i }));

    await user.click(screen.getByRole('button', { name: /confirmar e ativar escola/i }));

    expect(await screen.findByText(/itens pendentes/i)).toBeInTheDocument();
    expect(screen.getByText(/checklist incompleta/i)).toBeInTheDocument();
  });

  it('redirects non-owner staff away from the wizard', () => {
    renderWizard({
      user: staffUser,
      status: 'authenticated',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText(/configuração da escola/i)).not.toBeInTheDocument();
  });

  it('sends team invite when email is provided', async () => {
    let invitePayload: unknown;

    server.use(
      http.post(apiUrl('/api/v1/schools/:schoolId/people/memberships'), async ({ request }) => {
        invitePayload = await request.json();
        return HttpResponse.json(
          { data: { id: 99, status: 'invited', role: 'staff', display_title: 'Secretária' } },
          { status: 201 },
        );
      }),
    );

    renderWizard();
    await advanceToTeam();

    await user.type(screen.getByLabelText(/e-mail da secretária/i), 'secretaria@escola.example');
    await user.click(screen.getByRole('button', { name: /enviar convite/i }));

    await waitFor(() => {
      expect(invitePayload).toEqual({
        membership: {
          email: 'secretaria@escola.example',
          role: 'staff',
          role_template_id: 101,
          display_title: 'Secretária',
        },
      });
    });
    expect(screen.getByRole('button', { name: /confirmar e ativar escola/i })).toBeInTheDocument();
  });
});
