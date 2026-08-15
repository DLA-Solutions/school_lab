import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import { Charge } from 'types/charge';
import { Guardian } from 'types/guardian';
import GuardianChargesDialog from './GuardianChargesDialog';

const CHARGES_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/charges`;
const YEAR = new Date().getFullYear();

const user = userEvent.setup({ delay: null });

const guardian = { id: 7, name: 'Maria Silva' } as Guardian;

const charge = (overrides: Partial<Charge>): Charge => ({
  id: 1,
  billing_period: `${YEAR}-03-01`,
  original_amount_cents: 90_000,
  discount_amount_cents: 0,
  late_fee_amount_cents: 0,
  total_amount_cents: 90_000,
  due_date: `${YEAR}-03-10`,
  status: 'paid',
  kind: 'tuition',
  description: null,
  boleto_url: null,
  contract_id: 1,
  student: { id: 1, name: 'Pedro Silva' },
  guardian: { id: 7, name: 'Maria Silva', cpf: '12345678909' },
  ...overrides,
});

const stub = (rows: Charge[], total = rows.length) => {
  const seen: URLSearchParams[] = [];

  server.use(
    http.get(apiUrl(CHARGES_PATH), ({ request }) => {
      const params = new URL(request.url).searchParams;
      seen.push(params);
      const page = Number(params.get('page') ?? 1);

      return HttpResponse.json({
        data: rows.slice((page - 1) * 25, page * 25),
        meta: { page, per_page: 25, total },
      });
    }),
  );

  return seen;
};

const renderDialog = () => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(
    <GuardianChargesDialog open schoolId={SCHOOL_ID} guardian={guardian} onClose={vi.fn()} />,
  );
};

describe('GuardianChargesDialog', () => {
  it('asks only for this payer, within one calendar year', async () => {
    const seen = stub([charge({})]);

    renderDialog();
    await screen.findByText('Março');

    expect(seen[0].get('guardian_id')).toBe('7');
    expect(seen[0].get('due_date_from')).toBe(`${YEAR}-01-01`);
    expect(seen[0].get('due_date_to')).toBe(`${YEAR}-12-31`);
  });

  // Every month is listed, empty ones included: a family never billed for March is exactly what
  // the school is looking for here.
  it('lays the year out month by month, gaps and all', async () => {
    stub([charge({})]);

    renderDialog();

    expect(await screen.findByText('Janeiro')).toBeInTheDocument();
    expect(screen.getByText('Dezembro')).toBeInTheDocument();
    expect(screen.getAllByText(/nenhum boleto neste mês/i).length).toBe(11);
  });

  it('says whether each boleto was paid', async () => {
    stub([
      charge({ id: 1, status: 'paid' }),
      charge({ id: 2, billing_period: `${YEAR}-04-01`, due_date: `${YEAR}-04-10`, status: 'overdue' }),
    ]);

    renderDialog();
    await screen.findByText('Março');

    // "Pago" is also a totals label, so the statuses are read from the month rows.
    const march = screen.getByText('Março').closest('div') as HTMLElement;
    const april = screen.getByText('Abril').closest('div') as HTMLElement;

    expect(within(march).getByText(/^Pago$/)).toBeInTheDocument();
    expect(within(april).getByText(/^Vencido$/)).toBeInTheDocument();
  });

  // A one-off says what it was for; that description is the only thing identifying it.
  it('shows the description of a one-off charge', async () => {
    stub([
      charge({
        id: 3,
        kind: 'one_off',
        billing_period: null as unknown as string,
        due_date: `${YEAR}-06-15`,
        description: 'Excursão pedagógica',
        contract_id: null,
        student: null,
      }),
    ]);

    renderDialog();

    expect(await screen.findByText('Excursão pedagógica')).toBeInTheDocument();
    const june = screen.getByText('Junho').closest('div');
    expect(within(june as HTMLElement).getByText('Excursão pedagógica')).toBeInTheDocument();
  });

  it('totals what was billed, what was paid and what is still open', async () => {
    stub([
      charge({ id: 1, status: 'paid', total_amount_cents: 90_000 }),
      charge({ id: 2, billing_period: `${YEAR}-04-01`, status: 'pending', total_amount_cents: 50_000 }),
    ]);

    renderDialog();
    await screen.findByText('Março');

    // Billed 1400,00 — paid 900,00 — one still open. Read from the summary, since the same
    // amounts also appear on the rows they came from.
    const totals = screen.getByTestId('guardian-charges-totals');

    expect(within(totals).getByText('R$ 1.400,00')).toBeInTheDocument();
    expect(within(totals).getByText('R$ 900,00')).toBeInTheDocument();
    expect(within(totals).getByText('1')).toBeInTheDocument();
  });

  // A cancelled boleto is on the record but owed by nobody, so it counts towards neither total.
  it('leaves cancelled boletos out of the totals', async () => {
    stub([
      charge({ id: 1, status: 'paid', total_amount_cents: 90_000 }),
      charge({ id: 2, status: 'cancelled', total_amount_cents: 90_000 }),
    ]);

    renderDialog();
    await screen.findByText('Março');

    const totals = screen.getByTestId('guardian-charges-totals');

    // Billed and paid both 900,00 — the cancelled 900,00 counts towards neither.
    expect(within(totals).getAllByText('R$ 900,00').length).toBe(2);
    expect(within(totals).getByText('0')).toBeInTheDocument();
  });

  // Pagy fixes the page at 25 and takes no size from the client, so a family with several children
  // would otherwise appear to be missing boletos.
  it('walks past the first page of a busy year', async () => {
    const rows = Array.from({ length: 30 }, (_, index) =>
      charge({ id: index + 1, billing_period: `${YEAR}-0${(index % 9) + 1}-01` }),
    );
    const seen = stub(rows, rows.length);

    renderDialog();
    await screen.findByText('Março');

    await waitFor(() => expect(seen.length).toBeGreaterThan(1));
    expect(seen[1].get('page')).toBe('2');
  });

  it('says so when nothing was billed in the year', async () => {
    stub([]);

    renderDialog();

    expect(await screen.findByText(/nenhum boleto no período/i)).toBeInTheDocument();
  });

  it('refetches when another year is chosen', async () => {
    const seen = stub([charge({})]);

    renderDialog();
    await screen.findByText('Março');

    await user.click(screen.getByRole('combobox', { name: /ano/i }));
    await user.click(screen.getByRole('option', { name: String(YEAR - 1) }));

    await waitFor(() => {
      expect(seen.some((params) => params.get('due_date_from') === `${YEAR - 1}-01-01`)).toBe(true);
    });
  })

  // A guardian with more than one child sees every child's boletos mixed together, and the school
  // usually asks "is this family up to date" one child at a time.
  describe('filtering by child', () => {
    const twoChildren = () => [
      charge({ id: 1, student: { id: 1, name: 'Pedro Silva' } }),
      charge({
        id: 2,
        billing_period: `${YEAR}-04-01`,
        due_date: `${YEAR}-04-10`,
        student: { id: 2, name: 'Ana Silva' },
      }),
    ];

    it('offers the children this payer was billed for', async () => {
      stub(twoChildren());

      renderDialog();
      await screen.findByText('Março');

      await user.click(screen.getByRole('combobox', { name: /filho/i }));

      expect(screen.getByRole('option', { name: 'Pedro Silva' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Ana Silva' })).toBeInTheDocument();
    });

    it('narrows the months and the totals to the child chosen', async () => {
      stub(twoChildren());

      renderDialog();
      await screen.findByText('Março');

      await user.click(screen.getByRole('combobox', { name: /filho/i }));
      await user.click(screen.getByRole('option', { name: 'Ana Silva' }));

      // Read from the months rather than the document: the select keeps its options mounted, so
      // the other child's name is still present as an option.
      const march = screen.getByText('Março').closest('div') as HTMLElement;
      const april = screen.getByText('Abril').closest('div') as HTMLElement;

      expect(within(march).getByText(/nenhum boleto neste mês/i)).toBeInTheDocument();
      expect(within(april).getByText('Ana Silva')).toBeInTheDocument();

      const totals = screen.getByTestId('guardian-charges-totals');
      expect(within(totals).getAllByText('R$ 900,00').length).toBe(2);
    });

    // Nothing to tell apart, so the control would only be noise.
    it('leaves the filter out when there is a single child', async () => {
      stub([charge({})]);

      renderDialog();
      await screen.findByText('Março');

      expect(screen.queryByRole('combobox', { name: /filho/i })).not.toBeInTheDocument();
    });
  });
});
