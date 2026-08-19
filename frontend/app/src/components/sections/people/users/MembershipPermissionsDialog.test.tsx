import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, teamMemberships } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import MembershipPermissionsDialog from './MembershipPermissionsDialog';

const user = userEvent.setup({ delay: null });

const secretaryMembership = teamMemberships[1];
const PERMISSIONS_PATH = `/api/v1/schools/${SCHOOL_ID}/people/memberships/${secretaryMembership.id}/permissions`;

describe('MembershipPermissionsDialog', () => {
  it('grants manage_billing and refreshes after save', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');
    const onSaved = vi.fn();

    renderWithTheme(
      <MembershipPermissionsDialog
        open
        schoolId={SCHOOL_ID}
        membership={secretaryMembership}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );

    const billingToggle = await screen.findByRole('switch', { name: 'Gerenciar financeiro' });
    await user.click(billingToggle);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onSaved.mock.calls[0][0].permissions).toContain('manage_billing');
    expect(onSaved.mock.calls[0][0].permission_sources.manage_billing).toBe('grant');
  });

  it('denies manage_enrollment from the template baseline', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');
    const onSaved = vi.fn();

    renderWithTheme(
      <MembershipPermissionsDialog
        open
        schoolId={SCHOOL_ID}
        membership={secretaryMembership}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );

    const enrollmentToggle = await screen.findByRole('switch', { name: 'Gerenciar matrículas' });
    await user.click(enrollmentToggle);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onSaved.mock.calls[0][0].permissions).not.toContain('manage_enrollment');
  });

  it('surfaces a 403 when a non-owner patches overrides', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

    server.use(
      http.patch(apiUrl(PERMISSIONS_PATH), () =>
        HttpResponse.json(
          { error: { code: 'forbidden', message: 'Acesso negado.', details: {} } },
          { status: 403 },
        ),
      ),
    );

    renderWithTheme(
      <MembershipPermissionsDialog
        open
        schoolId={SCHOOL_ID}
        membership={secretaryMembership}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    const billingToggle = await screen.findByRole('switch', { name: 'Gerenciar financeiro' });
    await user.click(billingToggle);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Acesso negado.')).toBeInTheDocument();
  });
});
