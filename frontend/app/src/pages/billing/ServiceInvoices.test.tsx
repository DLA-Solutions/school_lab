import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  HttpResponse,
  SCHOOL_ID,
  ALL_ENABLED_MODULES,
  apiUrl,
  http,
  server,
  serviceInvoicesFixture,
  staffMembership,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import ServiceInvoices from './ServiceInvoices';

const PATH = `/api/v1/schools/${SCHOOL_ID}/billing/service_invoices`;

const user = userEvent.setup({ delay: null });

const billingStaffMembership = {
  ...staffMembership,
  permissions: ['manage_billing'],
  permission_sources: { manage_billing: 'template' },
  enabled_modules: [...ALL_ENABLED_MODULES],
};

const staffUser: AuthUser = {
  id: 1,
  email: 'admin@example.com',
  status: 'active',
  memberships: [billingStaffMembership],
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
    <MemoryRouter initialEntries={['/nfse']}>
      <AuthContext.Provider value={authValue}>
        <ServiceInvoices />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

describe('ServiceInvoices page', () => {
  it('lists service invoices for staff', async () => {
    server.use(http.get(apiUrl(PATH), () =>
      HttpResponse.json({
        data: serviceInvoicesFixture,
        meta: { page: 1, per_page: 25, total: serviceInvoicesFixture.length },
      }),
    ));

    renderPage();

    expect(await screen.findByText('NFS-e')).toBeInTheDocument();
    expect(await screen.findByText('12345')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
  });

  it('downloads an authorized PDF', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:nfse');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    server.use(
      http.get(apiUrl(PATH), () =>
        HttpResponse.json({
          data: serviceInvoicesFixture,
          meta: { page: 1, per_page: 25, total: serviceInvoicesFixture.length },
        }),
      ),
      http.get(apiUrl(`${PATH}/501/pdf`), () =>
        new HttpResponse(new Blob(['%PDF'], { type: 'application/pdf' }), {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        }),
      ),
    );

    renderPage();

    await screen.findByText('12345');
    await user.click(screen.getByRole('button', { name: /baixar pdf/i }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });
});
