import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  guardianMembership,
  http,
  myOpenCharges,
  server,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { withActiveMembership } from 'test/activeMembership';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import MyCharges from './MyCharges';

const BASE = `/api/v1/schools/${SCHOOL_ID}/me`;

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
      <MemoryRouter initialEntries={['/meus-boletos']}>
        <AuthContext.Provider value={authValue}>
          <MyCharges />
        </AuthContext.Provider>
      </MemoryRouter>,
    ),
  );
};

describe('MyCharges', () => {
  it('lists open boletos for the guardian', async () => {
    renderPage();

    expect(await screen.findByText('Meus boletos')).toBeInTheDocument();
    expect(await screen.findAllByText('R$ 850,00')).toHaveLength(2);
    expect(screen.getAllByText('Pedro Silva')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /ver e pagar/i })).toHaveLength(3);
  });

  it('shows payment history on the history tab', async () => {
    renderPage();

    await screen.findAllByText('R$ 850,00');
    await user.click(screen.getByRole('tab', { name: /histórico/i }));

    expect(await screen.findByText('R$ 800,00')).toBeInTheDocument();
    expect(screen.getByText(/pago em/i)).toBeInTheDocument();
  });

  it('shows NFS-e download on paid history when authorized', async () => {
    renderPage();

    await screen.findAllByText('R$ 850,00');
    await user.click(screen.getByRole('tab', { name: /histórico/i }));

    expect(await screen.findByRole('button', { name: /baixar nfs-e/i })).toBeInTheDocument();
  });

  it('filters open charges by child', async () => {
    renderPage();

    await screen.findAllByText('R$ 850,00');
    await user.click(screen.getByLabelText(/filho/i));
    await user.click(await screen.findByRole('option', { name: 'Ana Silva' }));

    await waitFor(() => {
      expect(screen.getByText('R$ 900,00')).toBeInTheDocument();
      expect(screen.queryByText('R$ 850,00')).not.toBeInTheDocument();
    });
  });

  it('opens detail with boleto and Pix, and reissues second copy', async () => {
    const reissued: unknown[] = [];
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    server.use(
      http.post(apiUrl(`${BASE}/charges/:id/reissue`), async ({ params }) => {
        const charge = myOpenCharges.find((row) => row.id === Number(params.id));
        reissued.push(params.id);

        return HttpResponse.json({
          data: {
            ...charge,
            payment_methods: {
              boleto_url: `${charge?.payment_methods.boleto_url}?reissued=1`,
              pix_copy_paste: `${charge?.payment_methods.pix_copy_paste}-reissued`,
            },
          },
        });
      }),
    );

    renderPage();

    await screen.findAllByText('R$ 850,00');
    await user.click(screen.getAllByRole('button', { name: /ver e pagar/i })[0]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/detalhes do boleto/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/00020126580014br.gov.bcb.pix101/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /copiar código pix/i }));
    expect(writeText).toHaveBeenCalledWith('00020126580014br.gov.bcb.pix101');

    await user.click(within(dialog).getByRole('button', { name: /segunda via/i }));

    await waitFor(() => expect(reissued).toEqual(['101']));
    expect(await screen.findByText(/segunda via emitida/i)).toBeInTheDocument();

    writeText.mockRestore();
  });

  it('shows empty state when there are no open boletos', async () => {
    server.use(
      http.get(apiUrl(`${BASE}/charges`), () =>
        HttpResponse.json({ data: [], meta: { page: 1, per_page: 25, total: 0 } }),
      ),
    );

    renderPage();

    expect(await screen.findByText(/nenhum boleto em aberto/i)).toBeInTheDocument();
  });

  it('shows empty history when nothing was paid yet', async () => {
    server.use(
      http.get(apiUrl(`${BASE}/charges/history`), () =>
        HttpResponse.json({ data: [], meta: { page: 1, per_page: 25, total: 0 } }),
      ),
    );

    renderPage();

    await screen.findByText('Meus boletos');
    await user.click(screen.getByRole('tab', { name: /histórico/i }));

    expect(await screen.findByText(/nenhum pagamento ainda/i)).toBeInTheDocument();
  });

  it('requests the next page of open boletos', async () => {
    const pages: string[] = [];

    server.use(
      http.get(apiUrl(`${BASE}/charges`), ({ request }) => {
        const url = new URL(request.url);
        const page = url.searchParams.get('page') ?? '1';
        pages.push(page);

        return HttpResponse.json({
          data: [
            {
              ...myOpenCharges[0],
              id: page === '1' ? 101 : 201,
              total_amount_cents: page === '1' ? 85_000 : 12_300,
            },
          ],
          meta: { page: Number(page), per_page: 25, total: 26 },
        });
      }),
    );

    renderPage();

    expect(await screen.findByText('R$ 850,00')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));

    await waitFor(() => {
      expect(pages).toContain('2');
    });
    expect(await screen.findByText('R$ 123,00')).toBeInTheDocument();
  });

  it('keeps NFS-e download when the invoice is past the first invoice page', async () => {
    const invoicePages: string[] = [];
    const filler = Array.from({ length: 25 }, (_, index) => ({
      id: 1000 + index,
      status: 'authorized',
      integration_id: `pay-${index}`,
      provider: 'fake',
      provider_document_id: null,
      invoice_number: String(index),
      verification_code: null,
      access_key: null,
      payment_id: 8000 + index,
      charge_id: 9000 + index,
      authorized_at: '2025-12-08T15:00:00Z',
      enqueued_at: null,
      failed_at: null,
      pdf_available: true,
    }));

    server.use(
      http.get(apiUrl(`${BASE}/service_invoices`), ({ request }) => {
        const url = new URL(request.url);
        const page = url.searchParams.get('page') ?? '1';
        invoicePages.push(page);

        if (page === '1') {
          return HttpResponse.json({
            data: filler,
            meta: { page: 1, per_page: 25, total: 26 },
          });
        }

        return HttpResponse.json({
          data: [
            {
              id: 501,
              status: 'authorized',
              integration_id: 'pay-9001',
              provider: 'fake',
              provider_document_id: 'fake-si-001',
              invoice_number: '12345',
              verification_code: 'ABCD1234',
              access_key: null,
              payment_id: 9001,
              charge_id: 88,
              authorized_at: '2025-12-08T15:00:00Z',
              enqueued_at: '2025-12-08T14:35:00Z',
              failed_at: null,
              pdf_available: true,
            },
          ],
          meta: { page: Number(page), per_page: 25, total: 26 },
        });
      }),
    );

    renderPage();

    await screen.findAllByText('R$ 850,00');
    await user.click(screen.getByRole('tab', { name: /histórico/i }));

    expect(await screen.findByRole('button', { name: /baixar nfs-e/i })).toBeInTheDocument();
    expect(invoicePages).toEqual(['1', '2']);
  });
});
