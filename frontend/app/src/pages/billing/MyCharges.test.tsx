import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  guardianMembership,
  http,
  jsonError,
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

/** Query strings of every `GET .../me/charges` the page sends, in order. */
const recordListQueries = () => {
  const queries: URLSearchParams[] = [];

  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === `${BASE}/charges`) {
      queries.push(url.searchParams);
    }
  });

  return queries;
};

const lastQuery = (queries: URLSearchParams[]) => queries[queries.length - 1];

/** Selects an option of a MUI select by its field label. */
const choose = async (label: RegExp | string, option: string) => {
  await user.click(screen.getByLabelText(label));
  await user.click(await screen.findByRole('option', { name: option }));
};

/** Text of the body rows, top to bottom. */
const bodyRows = () => screen.getAllByRole('row').slice(1);

describe('MyCharges', () => {
  beforeEach(() => {
    // Year options are built from "today"; pin it so the 2025/2026 fixtures stay selectable.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-08-04T12:00:00Z') });
  });

  afterEach(() => {
    vi.useRealTimers();
    server.events.removeAllListeners();
  });

  it('lists every boleto in one list, latest due date first, asking for status=all', async () => {
    const queries = recordListQueries();
    renderPage();

    expect(await screen.findByText('Meus boletos')).toBeInTheDocument();
    expect(await screen.findAllByText('R$ 850,00')).toHaveLength(2);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();

    // Never the legacy open-only default: the web always opts into the unified list.
    expect(queries[0].get('status')).toBe('all');
    expect(queries[0].has('month') || queries[0].has('year')).toBe(false);
    expect(queries[0].has('from') || queries[0].has('to')).toBe(false);

    // Fixture, due_date desc: 104 (2026-08-12), 101 (2026-08-10), 102 (2026-07-10), 88 (2025-12-10).
    const rows = bodyRows();
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText('R$ 900,00')).toBeInTheDocument();
    expect(within(rows[3]).getByText('R$ 800,00')).toBeInTheDocument();
  });

  it('tags each row Pago, Em aberto or Atrasado', async () => {
    renderPage();

    await screen.findAllByText('R$ 850,00');

    expect(screen.getAllByText('Em aberto')).toHaveLength(2);
    expect(screen.getAllByText('Atrasado')).toHaveLength(1);
    expect(screen.getAllByText('Pago')).toHaveLength(1);
    expect(within(bodyRows()[3]).getByText('Pago')).toBeInTheDocument();
    expect(within(bodyRows()[2]).getByText('Atrasado')).toBeInTheDocument();
  });

  it('shows the paid date, offers its NFS-e and no payment action on a paid row', async () => {
    renderPage();

    await screen.findAllByText('R$ 850,00');

    const paidRow = bodyRows()[3];
    const paidAt = new Date('2025-12-08T14:30:00Z').toLocaleDateString('pt-BR');
    expect(within(paidRow).getByText(paidAt)).toBeInTheDocument();
    expect(within(paidRow).getByText('10/12/2025')).toBeInTheDocument();
    expect(
      await within(paidRow).findByRole('button', { name: /baixar nfs-e/i }),
    ).toBeInTheDocument();
    expect(within(paidRow).queryByRole('button', { name: /ver e pagar/i })).not.toBeInTheDocument();
    expect(within(paidRow).getByRole('button', { name: /^ver$/i })).toBeInTheDocument();

    // The three open/overdue rows keep the pay entry point.
    expect(screen.getAllByRole('button', { name: /ver e pagar/i })).toHaveLength(3);
  });

  it('hides boleto, Pix and reissue in the detail of a paid boleto', async () => {
    renderPage();

    await screen.findAllByText('R$ 850,00');
    await user.click(within(bodyRows()[3]).getByRole('button', { name: /^ver$/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/detalhes do boleto/i)).toBeInTheDocument();
    expect(within(dialog).getByText('Pago')).toBeInTheDocument();
    expect(within(dialog).queryByText(/00020126580014br.gov.bcb.pix88/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /copiar código pix/i })).toBeNull();
    expect(within(dialog).queryByRole('button', { name: /visualizar boleto/i })).toBeNull();
    expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /segunda via/i })).not.toBeInTheDocument();
  });

  it('filters by child', async () => {
    const queries = recordListQueries();
    renderPage();

    await screen.findAllByText('R$ 850,00');
    await choose(/filho/i, 'Ana Silva');

    await waitFor(() => {
      expect(screen.getByText('R$ 900,00')).toBeInTheDocument();
      expect(screen.queryByText('R$ 850,00')).not.toBeInTheDocument();
      expect(screen.queryByText('R$ 800,00')).not.toBeInTheDocument();
    });
    expect(lastQuery(queries).get('student_id')).toBe('2');
    expect(lastQuery(queries).get('status')).toBe('all');
  });

  it('filters by status, sending the chosen status and status=all again for Todos', async () => {
    const queries = recordListQueries();
    renderPage();

    await screen.findAllByText('R$ 850,00');
    await choose(/situação/i, 'Pago');

    await waitFor(() => {
      expect(screen.getByText('R$ 800,00')).toBeInTheDocument();
      expect(screen.queryByText('R$ 900,00')).not.toBeInTheDocument();
    });
    expect(lastQuery(queries).get('status')).toBe('paid');

    await choose(/situação/i, 'Todos');

    expect(await screen.findByText('R$ 900,00')).toBeInTheDocument();
    expect(lastQuery(queries).get('status')).toBe('all');
  });

  it('filters by month and year, sending month and year and no range', async () => {
    const queries = recordListQueries();
    renderPage();

    await screen.findAllByText('R$ 850,00');
    // A month only means something inside a year.
    expect(screen.getByLabelText(/^mês$/i)).toHaveAttribute('aria-disabled', 'true');

    await choose(/^ano$/i, '2026');
    await choose(/^mês$/i, 'Agosto');

    await waitFor(() => {
      expect(screen.queryByText('R$ 800,00')).not.toBeInTheDocument();
      expect(screen.getAllByText('R$ 850,00')).toHaveLength(1);
      expect(screen.getByText('R$ 900,00')).toBeInTheDocument();
    });
    const query = lastQuery(queries);
    expect(query.get('year')).toBe('2026');
    expect(query.get('month')).toBe('8');
    expect(query.get('status')).toBe('all');
    expect(query.has('from') || query.has('to')).toBe(false);
  });

  it('sends just the year for a whole calendar year', async () => {
    const queries = recordListQueries();
    renderPage();

    await screen.findAllByText('R$ 850,00');
    await choose(/^ano$/i, '2025');

    expect(await screen.findByText('R$ 800,00')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('R$ 900,00')).not.toBeInTheDocument());
    expect(lastQuery(queries).get('year')).toBe('2025');
    expect(lastQuery(queries).has('month')).toBe(false);
  });

  it('filters by a from/to range, sending from and to and no month or year', async () => {
    const queries = recordListQueries();
    renderPage();

    await screen.findAllByText('R$ 850,00');
    await user.click(screen.getByRole('button', { name: 'Período' }));

    await user.type(screen.getByLabelText('Vencimento de'), '2026-08-01');
    await waitFor(() => {
      expect(screen.queryByText('R$ 800,00')).not.toBeInTheDocument();
      expect(screen.getByText('R$ 900,00')).toBeInTheDocument();
    });
    expect(lastQuery(queries).get('from')).toBe('2026-08-01');
    expect(lastQuery(queries).has('to')).toBe(false);

    await user.type(screen.getByLabelText('Vencimento até'), '2026-08-10');
    await waitFor(() => expect(screen.queryByText('R$ 900,00')).not.toBeInTheDocument());
    expect(screen.getByText('R$ 850,00')).toBeInTheDocument();
    expect(lastQuery(queries).get('from')).toBe('2026-08-01');
    expect(lastQuery(queries).get('to')).toBe('2026-08-10');
    expect(lastQuery(queries).has('month') || lastQuery(queries).has('year')).toBe(false);
  });

  it('never sends month/year together with from/to, even after switching modes', async () => {
    const queries = recordListQueries();
    renderPage();

    await screen.findAllByText('R$ 850,00');
    await choose(/^ano$/i, '2026');
    await choose(/^mês$/i, 'Agosto');
    await user.click(screen.getByRole('button', { name: 'Período' }));
    await user.type(screen.getByLabelText('Vencimento de'), '2026-07-01');
    await user.click(screen.getByRole('button', { name: 'Mês/ano' }));
    await choose(/^ano$/i, '2025');

    await waitFor(() => expect(lastQuery(queries).get('year')).toBe('2025'));
    for (const query of queries) {
      expect(
        (query.has('month') || query.has('year')) && (query.has('from') || query.has('to')),
      ).toBe(false);
    }
    // Switching to the other mode dropped the previous window: the field is empty again.
    expect(lastQuery(queries).has('month')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Período' }));
    expect(screen.getByLabelText('Vencimento de')).toHaveValue('');
  });

  it('blocks an inverted range inline without calling the API with it', async () => {
    const queries = recordListQueries();
    renderPage();

    await screen.findAllByText('R$ 850,00');
    await user.click(screen.getByRole('button', { name: 'Período' }));
    await user.type(screen.getByLabelText('Vencimento de'), '2026-08-01');
    await waitFor(() => expect(lastQuery(queries).get('from')).toBe('2026-08-01'));
    const sent = queries.length;

    await user.type(screen.getByLabelText('Vencimento até'), '2026-07-01');

    expect(
      await screen.findByText(/a data inicial não pode ser depois da data final/i),
    ).toBeInTheDocument();
    expect(queries).toHaveLength(sent);
    expect(queries.some((query) => query.get('to') === '2026-07-01')).toBe(false);
    expect(screen.queryByText(/nada encontrado/i)).not.toBeInTheDocument();
    expect(screen.queryByText('R$ 900,00')).not.toBeInTheDocument();

    // Fixing the end date lets the list load again.
    const to = screen.getByLabelText('Vencimento até');
    await user.clear(to);
    await user.type(to, '2026-08-31');
    expect(await screen.findByText('R$ 900,00')).toBeInTheDocument();
    expect(lastQuery(queries).get('to')).toBe('2026-08-31');
  });

  it('clears every filter at once', async () => {
    const queries = recordListQueries();
    renderPage();

    await screen.findAllByText('R$ 850,00');
    expect(screen.queryByRole('button', { name: /limpar filtros/i })).not.toBeInTheDocument();

    await choose(/situação/i, 'Pago');
    await choose(/^ano$/i, '2025');
    await choose(/filho/i, 'Pedro Silva');
    await user.click(await screen.findByRole('button', { name: /limpar filtros/i }));

    await waitFor(() => expect(screen.getAllByText('R$ 850,00')).toHaveLength(2));
    expect(screen.getByText('R$ 900,00')).toBeInTheDocument();
    const query = lastQuery(queries);
    expect(Object.fromEntries(query)).toEqual({ page: '1', status: 'all' });
    expect(screen.queryByRole('button', { name: /limpar filtros/i })).not.toBeInTheDocument();
  });

  it('goes back to page 1 when a filter changes', async () => {
    const queries = recordListQueries();
    server.use(
      http.get(apiUrl(`${BASE}/charges`), ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page') ?? '1');

        return HttpResponse.json({
          data: [{ ...myOpenCharges[0], id: 300 + page }],
          meta: { page, per_page: 25, total: 60 },
        });
      }),
    );
    renderPage();

    await screen.findAllByText('R$ 850,00');
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await waitFor(() => expect(lastQuery(queries).get('page')).toBe('2'));

    await choose(/situação/i, 'Pago');

    await waitFor(() => expect(lastQuery(queries).get('status')).toBe('paid'));
    expect(lastQuery(queries).get('page')).toBe('1');
  });

  it('shows a filtered empty state when the range matches nothing', async () => {
    renderPage();

    await screen.findAllByText('R$ 850,00');
    await user.click(screen.getByRole('button', { name: 'Período' }));
    await user.type(screen.getByLabelText('Vencimento de'), '2030-01-01');

    expect(await screen.findByText(/nada encontrado/i)).toBeInTheDocument();
  });

  it('surfaces an API validation error in the error banner', async () => {
    server.use(
      http.get(apiUrl(`${BASE}/charges`), () =>
        jsonError(422, 'validation_error', 'Dados inválidos.', {
          month: ['Use a month from 1 to 12.'],
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText('Dados inválidos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument();
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
    // Fixture order puts overdue charge 102 before pending charge 101 — the second
    // "Ver e pagar" button is charge 101's.
    await user.click(screen.getAllByRole('button', { name: /ver e pagar/i })[1]);

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

  it('does not offer a reissue from a paid boleto', async () => {
    renderPage();

    await screen.findAllByText('R$ 850,00');
    await user.click(screen.getByRole('button', { name: /^ver$/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/detalhes do boleto/i)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /segunda via/i })).not.toBeInTheDocument();
  });

  it('shows empty state when there are no boletos at all', async () => {
    server.use(
      http.get(apiUrl(`${BASE}/charges`), () =>
        HttpResponse.json({ data: [], meta: { page: 1, per_page: 25, total: 0 } }),
      ),
    );

    renderPage();

    expect(await screen.findByText(/nenhum boleto ainda/i)).toBeInTheDocument();
  });

  it('requests the next page of boletos', async () => {
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

    expect(await screen.findByRole('button', { name: /baixar nfs-e/i })).toBeInTheDocument();
    expect(invoicePages).toEqual(['1', '2']);
  });
});
