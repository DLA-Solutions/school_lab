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
import MyTaxDeclarations from './MyTaxDeclarations';

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
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const renderPage = () => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(
    withActiveMembership([guardianMembership])(
      <MemoryRouter initialEntries={['/imposto-de-renda']}>
        <AuthContext.Provider value={authValue}>
          <MyTaxDeclarations />
        </AuthContext.Provider>
      </MemoryRouter>,
    ),
  );
};

describe('MyTaxDeclarations', () => {
  it('lists declarations with version metadata', async () => {
    renderPage();

    expect(await screen.findByText('Imposto de renda')).toBeInTheDocument();
    expect(await screen.findByText(/ano 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/versão 2/i)).toBeInTheDocument();
    expect(screen.getByText('R$ 24.500,00')).toBeInTheDocument();
    expect(screen.getByText(/vigente/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /baixar pdf/i })).toBeInTheDocument();
  });

  it('opens detail metadata for the active version', async () => {
    renderPage();

    await screen.findByText(/ano 2025/i);
    await user.click(screen.getByRole('button', { name: /ver detalhes/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/detalhes da declaração/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/pedro silva: r\$ 12\.000,00/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/ana silva: r\$ 12\.500,00/i)).toBeInTheDocument();
  });

  it('generates a declaration for a selected year', async () => {
    const posts: unknown[] = [];

    server.use(
      http.post(apiUrl(`/api/v1/schools/${SCHOOL_ID}/me/tax_declarations`), async ({ request }) => {
        const body = (await request.json()) as { tax_declaration: { calendar_year: number } };
        posts.push(body.tax_declaration.calendar_year);

        return HttpResponse.json(
          {
            data: {
              tax_declaration_id: 82,
              calendar_year: body.tax_declaration.calendar_year,
              active_version_id: 95,
              version: {
                id: 95,
                number: 1,
                lifecycle: 'active',
                supersedes_version_id: null,
                total_declared_principal_amount_cents: 500_000,
                issued_at: '2026-01-10T10:00:00Z',
                students: [],
                pdf_url: `/api/v1/schools/${SCHOOL_ID}/me/tax_declarations/82/versions/95/pdf`,
              },
            },
          },
          { status: 201 },
        );
      }),
    );

    renderPage();

    await screen.findByText('Imposto de renda');
    await user.click(screen.getByLabelText(/ano-calendário/i));
    await user.click(screen.getByRole('option', { name: '2024' }));
    await user.click(screen.getByRole('button', { name: /^gerar declaração$/i }));

    await waitFor(() => expect(posts).toEqual([2024]));
    expect(await screen.findByText(/declaração de 2024 gerada com sucesso/i)).toBeInTheDocument();
  });

  it('shows ineligible state when there are no eligible payments', async () => {
    renderPage();

    await screen.findByText('Imposto de renda');
    await user.click(screen.getByLabelText(/ano-calendário/i));
    await user.click(screen.getByRole('option', { name: '2024' }));
    await user.click(screen.getByRole('button', { name: /^gerar declaração$/i }));

    expect(await screen.findByText(/sem pagamentos elegíveis/i)).toBeInTheDocument();
  });

  it('shows configuration incomplete state', async () => {
    renderPage();

    await screen.findByText('Imposto de renda');
    await user.click(screen.getByLabelText(/ano-calendário/i));
    await user.click(screen.getByRole('option', { name: '2023' }));
    await user.click(screen.getByRole('button', { name: /^gerar declaração$/i }));

    expect(await screen.findByText(/declaração indisponível/i)).toBeInTheDocument();
  });

  it('shows empty list state when the guardian has no declarations yet', async () => {
    server.use(
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/me/tax_declarations`), () =>
        HttpResponse.json({
          data: [],
          meta: { page: 1, per_page: 25, total: 0 },
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText(/nenhuma declaração ainda/i)).toBeInTheDocument();
  });
});
