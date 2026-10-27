import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
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
  myPaidCharges,
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

  it('names the filter-mode toggle with its visible label', async () => {
    renderPage();

    await screen.findAllByText('R$ 850,00');
    expect(screen.getByRole('group', { name: 'Filtrar vencimento por' })).toBeInTheDocument();
  });

  it('explains why the month stays disabled until a year is picked', async () => {
    renderPage();

    await screen.findAllByText('R$ 850,00');
    await user.hover(screen.getByLabelText(/^mês$/i));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Escolha um ano para filtrar por mês.',
    );
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
              digitable_line: charge?.payment_methods.digitable_line,
              boleto_pdf_available: false,
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

const invoiceOf = (overrides: Record<string, unknown>) => ({
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
  ...overrides,
});

describe('MyCharges Nota fiscal column', () => {
  const paidRow = myPaidCharges[0];

  /** Lists one paid charge (88) and answers the family's invoices with whatever is given. */
  const renderPaidWith = async (invoices: unknown[]) => {
    server.use(
      http.get(apiUrl(`${BASE}/charges`), () =>
        HttpResponse.json({ data: [paidRow], meta: { page: 1, per_page: 25, total: 1 } }),
      ),
      http.get(apiUrl(`${BASE}/service_invoices`), () =>
        HttpResponse.json({
          data: invoices,
          meta: { page: 1, per_page: 25, total: invoices.length },
        }),
      ),
    );
    renderPage();
    await screen.findByText('R$ 800,00');

    return bodyRows()[0].querySelector<HTMLElement>('[data-field="invoice"]') as HTMLElement;
  };

  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: () => 'blob:mock/nfse',
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is its own column, between the paid date and the actions', async () => {
    renderPage();
    await screen.findAllByText('R$ 850,00');

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers.indexOf('Nota fiscal')).toBeGreaterThan(-1);
    expect(headers.indexOf('Nota fiscal')).toBe(headers.indexOf('Ações') - 1);

    // The download moved out of the actions cell.
    const actions = bodyRows()[3].querySelector('[data-field="actions"]') as HTMLElement;
    expect(within(actions).queryByRole('button', { name: /baixar nfs-e/i })).toBeNull();
  });

  it('downloads the authorized NFS-e as nfse-<number>.pdf through the guardian endpoint', async () => {
    const pdfRequests: string[] = [];
    server.use(
      http.get(apiUrl(`${BASE}/service_invoices/:id/pdf`), ({ params }) => {
        pdfRequests.push(String(params.id));

        return new HttpResponse('%PDF-nfse', { headers: { 'Content-Type': 'application/pdf' } });
      }),
    );
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download);
    });

    renderPage();
    await screen.findAllByText('R$ 850,00');
    const cell = bodyRows()[3].querySelector('[data-field="invoice"]') as HTMLElement;
    await user.click(await within(cell).findByRole('button', { name: /baixar nfs-e/i }));

    await waitFor(() => expect(downloads).toEqual(['nfse-12345.pdf']));
    expect(pdfRequests).toEqual(['501']);
  });

  it('shows the API message when the NFS-e download fails', async () => {
    server.use(
      http.get(apiUrl(`${BASE}/service_invoices/:id/pdf`), () =>
        jsonError(409, 'service_invoice_pdf_unavailable', 'A NFS-e ainda não tem PDF.'),
      ),
    );

    renderPage();
    await screen.findAllByText('R$ 850,00');
    const cell = bodyRows()[3].querySelector('[data-field="invoice"]') as HTMLElement;
    await user.click(await within(cell).findByRole('button', { name: /baixar nfs-e/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A NFS-e ainda não tem PDF.');
  });

  it('shows a dash on every unpaid row, even when a note is already in flight for it', async () => {
    renderPage();
    await screen.findAllByText('R$ 850,00');

    // Fixture: charge 101 (pending) has an enqueued invoice; it still reads as "—".
    for (const row of bodyRows().slice(0, 3)) {
      const cell = row.querySelector('[data-field="invoice"]') as HTMLElement;
      expect(cell).toHaveTextContent('—');
      expect(within(cell).queryByRole('button')).toBeNull();
      expect(within(cell).queryByText('Em emissão')).toBeNull();
    }
  });

  it.each([
    ['pending', { status: 'pending', pdf_available: false, authorized_at: null }],
    ['enqueued', { status: 'enqueued', pdf_available: false, authorized_at: null }],
    ['authorized while the PDF is still being attached', { pdf_available: false }],
  ])('shows an issuing chip for a %s note', async (_label, overrides) => {
    const cell = await renderPaidWith([invoiceOf(overrides)]);

    expect(within(cell).getByText('Em emissão')).toBeInTheDocument();
    expect(within(cell).queryByRole('button')).toBeNull();
  });

  it.each(['rejected', 'failed', 'canceled'])(
    'does not surface a %s note to the guardian',
    async (status) => {
      const cell = await renderPaidWith([
        invoiceOf({ status, pdf_available: false, authorized_at: null }),
      ]);

      expect(cell).toHaveTextContent('—');
      expect(within(cell).queryByRole('button')).toBeNull();
      expect(within(cell).queryByText('Em emissão')).toBeNull();
    },
  );

  it('shows a dash for a paid boleto that has no note yet', async () => {
    const cell = await renderPaidWith([]);

    expect(cell).toHaveTextContent('—');
    expect(within(cell).queryByRole('button')).toBeNull();
  });

  it('prefers the authorized note over a newer failed one for the same boleto', async () => {
    const cell = await renderPaidWith([
      invoiceOf({ id: 700, status: 'failed', pdf_available: false, invoice_number: null }),
      invoiceOf({ id: 501 }),
    ]);

    expect(within(cell).getByRole('button', { name: /baixar nfs-e/i })).toBeInTheDocument();
  });

  it('otherwise follows the most recent note', async () => {
    const newerPending = await renderPaidWith([
      invoiceOf({ id: 600, status: 'failed', pdf_available: false, authorized_at: null }),
      invoiceOf({ id: 700, status: 'pending', pdf_available: false, authorized_at: null }),
    ]);

    expect(within(newerPending).getByText('Em emissão')).toBeInTheDocument();
  });
});

const PIX = '00020126580014br.gov.bcb.pix0000000000';
const LINE = '23793.38128 60000.000003 00000.000400 1 93480000085000';

/** Banco Inter's side of the contract: no hosted link, the PDF only through the API. */
const interMethods = {
  boleto_url: null,
  pix_copy_paste: PIX,
  digitable_line: LINE,
  boleto_pdf_available: true,
};

const nothingYet = {
  boleto_url: null,
  pix_copy_paste: null,
  digitable_line: null,
  boleto_pdf_available: false,
};

const POLL_MS = 20_000;
const POLL_CAP = 30;

describe('MyCharges payment methods', () => {
  const objectUrls: Blob[] = [];
  const detailRequests: string[] = [];
  const pdfRequests: Headers[] = [];

  /** The detail of charge 101 as the API would answer it, whatever it holds. */
  const answerDetailWith = (paymentMethods: Record<string, unknown>, status = 'pending') =>
    server.use(
      http.get(apiUrl(`${BASE}/charges/:id`), ({ params }) => {
        detailRequests.push(String(params.id));

        return HttpResponse.json({
          data: { ...myOpenCharges[0], status, payment_methods: paymentMethods },
        });
      }),
    );

  let unmountPage: () => void = () => {};

  const openFirstDetail = async () => {
    ({ unmount: unmountPage } = renderPage());

    await screen.findAllByText('R$ 850,00');
    await user.click(screen.getAllByRole('button', { name: /ver e pagar/i })[0]);

    return screen.findByRole('dialog');
  };

  const answerPdfWith = (response: () => Response) =>
    server.use(
      http.get(apiUrl(`${BASE}/charges/:id/boleto_pdf`), ({ request }) => {
        pdfRequests.push(request.headers);

        return response();
      }),
    );

  const pdfResponse = () =>
    new HttpResponse('%PDF-1.4', { headers: { 'Content-Type': 'application/pdf' } });

  beforeEach(() => {
    objectUrls.length = 0;
    detailRequests.length = 0;
    pdfRequests.length = 0;

    // jsdom has no object URLs; the frame is pointed at one and a download is a click on one.
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: (blob: Blob) => {
        objectUrls.push(blob);
        return `blob:mock/${objectUrls.length}`;
      },
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('copying what to pay with', () => {
    it('shows the Pix code and the linha digitavel, each with its own copy button', async () => {
      answerDetailWith(interMethods);
      const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

      const dialog = await openFirstDetail();

      expect(await within(dialog).findByText(PIX)).toBeInTheDocument();
      expect(within(dialog).getByText('Linha digitável')).toBeInTheDocument();
      expect(within(dialog).getByText(LINE)).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: 'Copiar código Pix' }));
      expect(writeText).toHaveBeenLastCalledWith(PIX);
      expect(
        await within(dialog).findByRole('button', { name: 'Código Pix copiado' }),
      ).toBeInTheDocument();

      // The line goes to the clipboard exactly as it is shown, dots and spaces included.
      await user.click(within(dialog).getByRole('button', { name: 'Copiar linha digitável' }));
      expect(writeText).toHaveBeenLastCalledWith(LINE);
      expect(
        await within(dialog).findByRole('button', { name: 'Linha digitável copiada' }),
      ).toBeInTheDocument();
    });

    it('says so when the clipboard refuses the linha digitavel', async () => {
      answerDetailWith(interMethods);
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));

      const dialog = await openFirstDetail();
      await user.click(await within(dialog).findByRole('button', { name: 'Copiar linha digitável' }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Não foi possível copiar a linha digitável.',
      );
    });

    it('shows a linha digitavel without a Pix code, and the other way round', async () => {
      answerDetailWith({ ...nothingYet, digitable_line: LINE });
      const first = await openFirstDetail();

      expect(await within(first).findByText(LINE)).toBeInTheDocument();
      expect(within(first).queryByText('Pix copia e cola')).not.toBeInTheDocument();
      expect(within(first).queryByText(/estamos gerando/i)).not.toBeInTheDocument();
    });
  });

  describe('the hosted boleto (Cora)', () => {
    it('keeps the preview and the link out to the provider, without a PDF button', async () => {
      answerDetailWith({ ...nothingYet, boleto_url: 'https://provider.example/boleto/101.pdf' });

      const dialog = await openFirstDetail();

      expect(await within(dialog).findByRole('button', { name: 'Ver boleto' })).toBeInTheDocument();
      expect(within(dialog).getByRole('link', { name: 'Abrir' })).toHaveAttribute(
        'href',
        'https://provider.example/boleto/101.pdf',
      );
      expect(
        within(dialog).queryByRole('button', { name: 'Ver boleto (PDF)' }),
      ).not.toBeInTheDocument();
      // A link is something to pay with: neither "being generated" nor "nothing to pay with".
      expect(within(dialog).queryByText(/estamos gerando/i)).not.toBeInTheDocument();
      expect(within(dialog).queryByText(/ainda não estão disponíveis/i)).not.toBeInTheDocument();
    });

    it('never asks the API for a PDF it does not have', async () => {
      answerDetailWith({ ...nothingYet, boleto_url: 'https://provider.example/boleto/101.pdf' });
      answerPdfWith(pdfResponse);

      const dialog = await openFirstDetail();
      await within(dialog).findByRole('button', { name: 'Ver boleto' });

      expect(pdfRequests).toHaveLength(0);
    });
  });

  describe('the boleto PDF (Banco Inter)', () => {
    it('opens the PDF through the authenticated API, only once the guardian asks', async () => {
      answerDetailWith(interMethods);
      answerPdfWith(pdfResponse);

      const dialog = await openFirstDetail();
      const open = await within(dialog).findByRole('button', { name: 'Ver boleto (PDF)' });
      expect(pdfRequests).toHaveLength(0);

      await user.click(open);

      expect(await screen.findByTitle('Pré-visualização do boleto')).toHaveAttribute(
        'src',
        'blob:mock/1',
      );
      expect(pdfRequests).toHaveLength(1);
      // A bare frame could not send this; the fetch has to.
      expect(pdfRequests[0].get('Authorization')).toBe('Bearer fresh-access-token');
    });

    it('downloads the file it drew without asking the bank again', async () => {
      answerDetailWith(interMethods);
      answerPdfWith(pdfResponse);
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      const dialog = await openFirstDetail();
      await user.click(await within(dialog).findByRole('button', { name: 'Ver boleto (PDF)' }));
      await screen.findByTitle('Pré-visualização do boleto');

      await user.click(screen.getByRole('button', { name: 'Baixar PDF' }));

      expect(click).toHaveBeenCalledTimes(1);
      expect(pdfRequests).toHaveLength(1);
    });

    it('does not offer the PDF while the API says it is not available', async () => {
      answerDetailWith({ ...interMethods, boleto_pdf_available: false });

      const dialog = await openFirstDetail();
      await within(dialog).findByText(PIX);

      expect(
        within(dialog).queryByRole('button', { name: 'Ver boleto (PDF)' }),
      ).not.toBeInTheDocument();
    });

    it('explains a 409 as not available and offers no retry', async () => {
      answerDetailWith(interMethods);
      answerPdfWith(() => jsonError(409, 'boleto_pdf_unavailable', 'indisponível'));

      const dialog = await openFirstDetail();
      await user.click(await within(dialog).findByRole('button', { name: 'Ver boleto (PDF)' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Este boleto não está disponível para visualização agora.',
      );
      expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
      expect(pdfRequests).toHaveLength(1);
    });

    it('reports a 502 from the bank without retrying on its own', async () => {
      answerDetailWith(interMethods);
      answerPdfWith(() => jsonError(502, 'boleto_pdf_provider_error', 'rejeitado'));

      const dialog = await openFirstDetail();
      await user.click(await within(dialog).findByRole('button', { name: 'Ver boleto (PDF)' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'O banco não conseguiu entregar o boleto.',
      );
      expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
      expect(pdfRequests).toHaveLength(1);
    });

    it('offers a retry on a 503 and shows the boleto when the bank answers', async () => {
      answerDetailWith(interMethods);
      answerPdfWith(() => jsonError(503, 'boleto_pdf_provider_unavailable', 'fora do ar'));

      const dialog = await openFirstDetail();
      await user.click(await within(dialog).findByRole('button', { name: 'Ver boleto (PDF)' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('O banco está indisponível');

      answerPdfWith(pdfResponse);
      await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

      expect(await screen.findByTitle('Pré-visualização do boleto')).toBeInTheDocument();
      expect(pdfRequests).toHaveLength(2);
    });
  });

  describe('previewing the boleto straight from the row', () => {
    const rowOf = (id: number, overrides: Record<string, unknown> = {}) => ({
      ...myOpenCharges[0],
      id,
      ...overrides,
    });

    /** Replaces the listing, newest due date first as the API would send it. */
    const answerListWith = (rows: unknown[]) =>
      server.use(
        http.get(apiUrl(`${BASE}/charges`), () =>
          HttpResponse.json({
            data: rows,
            meta: { page: 1, per_page: 25, total: rows.length },
          }),
        ),
      );

    const renderList = async () => {
      renderPage();
      await screen.findAllByText('R$ 850,00');
    };

    it('opens the hosted (Cora) boleto in the popup without opening the detail', async () => {
      answerListWith([rowOf(101)]);
      const hostedRequests: string[] = [];
      server.use(
        http.get('https://provider.example/boleto/101.pdf', ({ request }) => {
          hostedRequests.push(request.url);

          return pdfResponse();
        }),
      );

      await renderList();
      await user.click(within(bodyRows()[0]).getByRole('button', { name: 'Ver boleto' }));

      expect(await screen.findByTitle('Pré-visualização do boleto')).toHaveAttribute(
        'src',
        'blob:mock/1',
      );
      expect(hostedRequests).toEqual(['https://provider.example/boleto/101.pdf']);
      // Only the boleto popup is open; the detail dialog was never asked for.
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
      expect(detailRequests).toHaveLength(0);
      expect(pdfRequests).toHaveLength(0);
      expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeEnabled();
    });

    it('opens the Inter PDF through the authenticated API and downloads the same file', async () => {
      answerListWith([rowOf(101, { payment_methods: interMethods })]);
      answerPdfWith(pdfResponse);
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      await renderList();
      await user.click(within(bodyRows()[0]).getByRole('button', { name: 'Ver boleto (PDF)' }));

      expect(await screen.findByTitle('Pré-visualização do boleto')).toHaveAttribute(
        'src',
        'blob:mock/1',
      );
      expect(pdfRequests).toHaveLength(1);
      expect(pdfRequests[0].get('Authorization')).toBe('Bearer fresh-access-token');
      expect(detailRequests).toHaveLength(0);

      await user.click(screen.getByRole('button', { name: 'Baixar PDF' }));

      expect(click).toHaveBeenCalledTimes(1);
      expect(pdfRequests).toHaveLength(1);
    });

    it('offers no preview where there is no boleto to show', async () => {
      answerListWith([
        rowOf(101, { payment_methods: nothingYet }),
        rowOf(102, {
          status: 'paid',
          paid_at: '2026-08-01T10:00:00Z',
          payment_methods: nothingYet,
        }),
        rowOf(103, { status: 'cancelled', payment_methods: interMethods }),
        rowOf(104),
      ]);

      await renderList();
      const rows = bodyRows();

      for (const row of rows.slice(0, 3)) {
        expect(within(row).queryByRole('button', { name: /^ver boleto/i })).not.toBeInTheDocument();
        // The detail entry point stays on every row.
        expect(within(row).getAllByRole('button').length).toBeGreaterThan(0);
      }
      expect(within(rows[3]).getByRole('button', { name: 'Ver boleto' })).toBeInTheDocument();
    });

    it('never shows the previous boleto when another one is opened after closing', async () => {
      answerListWith([
        rowOf(101, { payment_methods: interMethods }),
        rowOf(102, { payment_methods: interMethods }),
      ]);
      const requested: string[] = [];
      server.use(
        http.get(apiUrl(`${BASE}/charges/:id/boleto_pdf`), ({ params }) => {
          requested.push(String(params.id));

          return pdfResponse();
        }),
      );

      await renderList();
      await user.click(within(bodyRows()[0]).getByRole('button', { name: 'Ver boleto (PDF)' }));
      expect(await screen.findByTitle('Pré-visualização do boleto')).toHaveAttribute(
        'src',
        'blob:mock/1',
      );

      await user.click(screen.getByRole('button', { name: 'Fechar' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      await user.click(within(bodyRows()[1]).getByRole('button', { name: 'Ver boleto (PDF)' }));
      expect(await screen.findByTitle('Pré-visualização do boleto')).toHaveAttribute(
        'src',
        'blob:mock/2',
      );
      expect(requested).toEqual(['101', '102']);
    });
  });

  describe('while the bank is still generating the boleto', () => {
    beforeEach(() => {
      // Testing Library drains its async helpers with a `setTimeout(0)`; a clock that never moves
      // on its own would hang every `findBy`, so it ticks with real time and is pushed by hand.
      vi.useFakeTimers({
        toFake: ['Date', 'setTimeout', 'clearTimeout'],
        now: new Date('2026-08-04T12:00:00Z'),
        shouldAdvanceTime: true,
      });
    });

    const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

    it('shows a generating state instead of "nothing to pay with"', async () => {
      answerDetailWith(nothingYet);

      const dialog = await openFirstDetail();

      expect(await within(dialog).findByText('Estamos gerando o seu boleto')).toBeInTheDocument();
      expect(within(dialog).queryByText(/ainda não estão disponíveis/i)).not.toBeInTheDocument();
      expect(within(dialog).queryByRole('button', { name: /copiar/i })).not.toBeInTheDocument();
    });

    it('asks again on a timer and swaps in the Pix, the linha and the PDF once they arrive', async () => {
      answerDetailWith(nothingYet);
      const dialog = await openFirstDetail();
      await within(dialog).findByText('Estamos gerando o seu boleto');
      expect(detailRequests).toHaveLength(1);

      await advance(POLL_MS);
      expect(detailRequests).toHaveLength(2);
      expect(within(dialog).getByText('Estamos gerando o seu boleto')).toBeInTheDocument();

      answerDetailWith(interMethods);
      await advance(POLL_MS);

      expect(await within(dialog).findByText(PIX)).toBeInTheDocument();
      expect(within(dialog).getByText(LINE)).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Ver boleto (PDF)' })).toBeInTheDocument();
      expect(within(dialog).queryByText('Estamos gerando o seu boleto')).not.toBeInTheDocument();

      // Data is in: nothing keeps asking.
      const settled = detailRequests.length;
      await advance(POLL_MS * 5);
      expect(detailRequests).toHaveLength(settled);
    });

    it('stops asking when the detail is closed', async () => {
      answerDetailWith(nothingYet);
      const dialog = await openFirstDetail();
      await within(dialog).findByText('Estamos gerando o seu boleto');

      await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));
      await advance(POLL_MS * 5);

      expect(detailRequests).toHaveLength(1);
    });

    it('stops asking when the page goes away', async () => {
      answerDetailWith(nothingYet);
      const dialog = await openFirstDetail();
      await within(dialog).findByText('Estamos gerando o seu boleto');

      unmountPage();
      await advance(POLL_MS * 5);

      expect(detailRequests).toHaveLength(1);
    });

    it('never has two requests in flight', async () => {
      let release: () => void = () => {};
      let inFlight = 0;
      let peak = 0;
      let calls = 0;

      server.use(
        http.get(apiUrl(`${BASE}/charges/:id`), async () => {
          calls += 1;
          if (calls > 1) {
            inFlight += 1;
            peak = Math.max(peak, inFlight);
            await new Promise<void>((done) => {
              release = done;
            });
            inFlight -= 1;
          }

          return HttpResponse.json({
            data: { ...myOpenCharges[0], payment_methods: nothingYet },
          });
        }),
      );

      const dialog = await openFirstDetail();
      await within(dialog).findByText('Estamos gerando o seu boleto');

      await advance(POLL_MS * 4);
      expect(calls).toBe(2);
      expect(peak).toBe(1);

      release();
      await advance(POLL_MS);
      expect(calls).toBe(3);
    });

    it('gives up after a cap and lets the guardian check again by hand', async () => {
      answerDetailWith(nothingYet);
      const dialog = await openFirstDetail();
      await within(dialog).findByText('Estamos gerando o seu boleto');

      for (let attempt = 0; attempt < POLL_CAP; attempt += 1) {
        await advance(POLL_MS);
      }

      expect(detailRequests).toHaveLength(1 + POLL_CAP);
      expect(await within(dialog).findByText(/ainda não ficou pronto no banco/i)).toBeInTheDocument();

      await advance(POLL_MS * 5);
      expect(detailRequests).toHaveLength(1 + POLL_CAP);

      answerDetailWith(interMethods);
      await user.click(within(dialog).getByRole('button', { name: 'Verificar de novo' }));
      await advance(POLL_MS);

      expect(await within(dialog).findByText(PIX)).toBeInTheDocument();
    });

    it('does not wait on a charge that is already paid', async () => {
      answerDetailWith(nothingYet, 'paid');

      const dialog = await openFirstDetail();
      await within(dialog).findByText(/detalhes do boleto/i);
      await advance(POLL_MS * 3);

      expect(within(dialog).queryByText(/estamos gerando/i)).not.toBeInTheDocument();
      expect(detailRequests).toHaveLength(1);
    });
  });
});
