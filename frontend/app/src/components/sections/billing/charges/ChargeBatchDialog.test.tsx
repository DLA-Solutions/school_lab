import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ACCESS_EXPIRES_AT,
  FRESH_ACCESS_TOKEN,
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  http,
  server,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import { SchoolYear } from 'services/schoolYearsApi';
import { BillableContract } from 'types/charge';
import ChargeBatchDialog from './ChargeBatchDialog';

const BATCHES_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/charge_batches`;
const SCHOOL_YEARS_PATH = `/api/v1/schools/${SCHOOL_ID}/school_years`;

const user = userEvent.setup({ delay: null });

const billable: BillableContract[] = [
  {
    contract_id: 91,
    student_id: 1,
    student_name: 'Pedro Silva',
    payer: { id: 7, name: 'Maria Silva', cpf: '12345678909' },
    monthly_amount_cents: 85_000,
    due_day: 10,
    already_charged: false,
    without_contract: false,
    tags: [],
  },
  {
    contract_id: 92,
    student_id: 2,
    student_name: 'Ana Silva',
    payer: { id: 7, name: 'Maria Silva', cpf: '12345678909' },
    monthly_amount_cents: 60_000,
    due_day: 5,
    already_charged: false,
    without_contract: false,
    tags: [],
  },
  {
    contract_id: 93,
    student_id: 3,
    student_name: 'Bruno Costa',
    payer: { id: 8, name: 'Carla Costa', cpf: '98765432100' },
    monthly_amount_cents: 70_000,
    due_day: 10,
    already_charged: true,
    without_contract: false,
    tags: [],
  },
];

// Enrolled, but no contract yet: listed so the school sees who is missing one, never billable.
const withoutContract: BillableContract = {
  contract_id: null,
  student_id: 4,
  student_name: 'Carlos Lima',
  payer: null,
  monthly_amount_cents: null,
  due_day: null,
  already_charged: false,
  without_contract: true,
  tags: [],
};

// Has contract history, but nothing billable: the old contract was cancelled and its replacement
// is still unsigned. Both tags apply at once — a real, confirmed case — and the row still has no
// contract to bill, same as `withoutContract`, but it is not that case: there is history here.
const tagged: BillableContract = {
  contract_id: null,
  student_id: 5,
  student_name: 'Diana Rocha',
  payer: null,
  monthly_amount_cents: null,
  due_day: null,
  already_charged: false,
  without_contract: false,
  tags: ['cancelled', 'pending_signature'],
};

const year2025: SchoolYear = {
  id: 9,
  school_id: SCHOOL_ID,
  name: 'Ano Letivo 2025',
  starts_on: '2025-02-01',
  ends_on: '2025-12-15',
  status: 'archived',
};

const activeYear2026: SchoolYear = {
  id: 10,
  school_id: SCHOOL_ID,
  name: 'Ano Letivo 2026',
  starts_on: '2026-02-01',
  ends_on: '2026-12-15',
  status: 'active',
};

const renderDialog = (onIssued = vi.fn()) => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  renderWithTheme(
    <ChargeBatchDialog open schoolId={SCHOOL_ID} onClose={vi.fn()} onIssued={onIssued} />,
  );

  return onIssued;
};

describe('ChargeBatchDialog', () => {
  it('starts with every uncharged contract ticked and totals what will go out', async () => {
    server.use(http.get(apiUrl(BATCHES_PATH), () => HttpResponse.json({ data: billable })));

    renderDialog();

    // 85.000 + 60.000 cents; the contract already charged for the period is left out.
    await screen.findByText(/2 contrato\(s\) selecionado\(s\)/);
    expect(screen.getByText(/R\$\s?1\.450,00/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Emitir 2 boleto(s)' })).toBeEnabled();
  });

  // Billing it again would hand the family a second boleto for the same month.
  it('will not let a contract already charged for the period be selected', async () => {
    server.use(http.get(apiUrl(BATCHES_PATH), () => HttpResponse.json({ data: billable })));

    renderDialog();

    const brunoRow = (await screen.findByText('Bruno Costa')).closest('[role="row"]');
    expect(brunoRow).toBeTruthy();

    const checkbox = within(brunoRow as HTMLElement).getByRole('checkbox');

    expect(checkbox).toBeDisabled();
    expect(screen.getByText('J\u00e1 cobrado nesta compet\u00eancia')).toBeInTheDocument();
  });

  it('sends the selected contracts and the period the school named', async () => {
    let body: unknown;

    server.use(
      http.get(apiUrl(BATCHES_PATH), () => HttpResponse.json({ data: billable })),
      http.post(apiUrl(BATCHES_PATH), async ({ request }) => {
        body = await request.json();

        return HttpResponse.json(
          {
            data: {
              created_charges: [],
              created_count: 2,
              skipped_contract_ids: [],
              ineligible_contract_ids: [],
              contract_ids_without_payer: [],
            },
          },
          { status: 201 },
        );
      }),
    );

    const onIssued = renderDialog();

    await screen.findByText(/2 contrato\(s\) selecionado\(s\)/);
    await user.click(screen.getByRole('button', { name: 'Emitir 2 boleto(s)' }));

    await waitFor(() => expect(onIssued).toHaveBeenCalled());
    // The school bills on the 5th, so the batch starts there rather than on nothing.
    expect(body).toMatchObject({ contract_ids: [91, 92] });
    expect((body as { due_date: string }).due_date).toMatch(/-05$/);
  });

  // The grid cell is a flex row: name and CPF must live in one wrapper, or they sit side by side.
  it('stacks the payer CPF under the payer name in the same cell', async () => {
    server.use(http.get(apiUrl(BATCHES_PATH), () => HttpResponse.json({ data: billable })));

    renderDialog();

    const row = (await screen.findByText('Bruno Costa')).closest(
      '[role="row"]',
    ) as HTMLElement;
    const name = within(row).getByText('Carla Costa');
    const cpf = within(row).getByText(/^CPF /);

    expect(name.parentElement).toBe(cpf.parentElement);
    expect(name.parentElement?.children).toHaveLength(2);
  });

  it('unticks everything at once from the header checkbox', async () => {
    server.use(http.get(apiUrl(BATCHES_PATH), () => HttpResponse.json({ data: billable })));

    renderDialog();

    const toggleAll = await screen.findByRole('checkbox', {
      name: 'Selecionar todos os contratos',
    });

    await user.click(toggleAll);

    // Nothing selected means nothing to send, so the action closes itself off.
    expect(screen.getByRole('button', { name: 'Emitir 0 boleto(s)' })).toBeDisabled();
  });

  describe('student without a contract', () => {
    const withMissing = [...billable, withoutContract];

    it('shows the student flagged, with no amount, due day or payer, and a hint', async () => {
      server.use(http.get(apiUrl(BATCHES_PATH), () => HttpResponse.json({ data: withMissing })));

      renderDialog();

      const row = (await screen.findByText('Carlos Lima')).closest('[role="row"]') as HTMLElement;

      expect(within(row).getByText('Sem contrato')).toBeInTheDocument();
      expect(within(row).queryByText(/R\$/)).not.toBeInTheDocument();
      expect(within(row).queryByText('Sem respons\u00e1vel financeiro')).not.toBeInTheDocument();
      expect(screen.getByText(/Alunos sem contrato n\u00e3o podem receber boleto/)).toBeInTheDocument();
    });

    it('cannot be ticked, and stays out of the default selection and the totals', async () => {
      server.use(http.get(apiUrl(BATCHES_PATH), () => HttpResponse.json({ data: withMissing })));

      renderDialog();

      const row = (await screen.findByText('Carlos Lima')).closest('[role="row"]') as HTMLElement;

      expect(within(row).getByRole('checkbox')).toBeDisabled();
      // Same two billable contracts as before; the missing-contract student adds nothing.
      await screen.findByText(/2 contrato\(s\) selecionado\(s\)/);
      expect(screen.getByText(/R\$\s?1\.450,00/)).toBeInTheDocument();
    });

    it('is not picked up by the header checkbox and never reaches the request', async () => {
      let body: unknown;

      server.use(
        http.get(apiUrl(BATCHES_PATH), () => HttpResponse.json({ data: withMissing })),
        http.post(apiUrl(BATCHES_PATH), async ({ request }) => {
          body = await request.json();

          return HttpResponse.json(
            {
              data: {
                created_charges: [],
                created_count: 2,
                skipped_contract_ids: [],
                ineligible_contract_ids: [],
                contract_ids_without_payer: [],
              },
            },
            { status: 201 },
          );
        }),
      );

      const onIssued = renderDialog();

      const toggleAll = await screen.findByRole('checkbox', {
        name: 'Selecionar todos os contratos',
      });

      // Untick, then tick everything again: select-all must still skip the missing contract.
      await user.click(toggleAll);
      await user.click(toggleAll);

      await screen.findByText(/2 contrato\(s\) selecionado\(s\)/);
      await user.click(screen.getByRole('button', { name: 'Emitir 2 boleto(s)' }));

      await waitFor(() => expect(onIssued).toHaveBeenCalled());
      expect((body as { contract_ids: number[] }).contract_ids).toEqual([91, 92]);
    });
  });

  describe('school year filter', () => {
    it('defaults to the active year and sends it with the listing request', async () => {
      const requests: URL[] = [];

      server.use(
        http.get(apiUrl(SCHOOL_YEARS_PATH), () =>
          HttpResponse.json({ data: [year2025, activeYear2026] }),
        ),
        http.get(apiUrl(`${SCHOOL_YEARS_PATH}/active`), () =>
          HttpResponse.json({ data: activeYear2026 }),
        ),
        http.get(apiUrl(BATCHES_PATH), ({ request }) => {
          requests.push(new URL(request.url));
          return HttpResponse.json({ data: billable });
        }),
      );

      renderDialog();

      await screen.findByText('Pedro Silva');

      await waitFor(() =>
        expect(requests[requests.length - 1]?.searchParams.get('school_year_id')).toBe('10'),
      );
      expect(screen.getByRole('combobox', { name: 'Ano letivo' })).toHaveTextContent(
        'Ano Letivo 2026',
      );
    });

    it('reloads the listing when a different school year is chosen', async () => {
      const requests: URL[] = [];

      server.use(
        http.get(apiUrl(SCHOOL_YEARS_PATH), () =>
          HttpResponse.json({ data: [year2025, activeYear2026] }),
        ),
        http.get(apiUrl(`${SCHOOL_YEARS_PATH}/active`), () =>
          HttpResponse.json({ data: activeYear2026 }),
        ),
        http.get(apiUrl(BATCHES_PATH), ({ request }) => {
          requests.push(new URL(request.url));
          return HttpResponse.json({ data: billable });
        }),
      );

      renderDialog();
      await screen.findByText('Pedro Silva');

      await user.click(screen.getByRole('combobox', { name: 'Ano letivo' }));
      await user.click(await screen.findByRole('option', { name: 'Ano Letivo 2025' }));

      await waitFor(() =>
        expect(requests[requests.length - 1]?.searchParams.get('school_year_id')).toBe('9'),
      );
    });

    // No active year and no override: "every year" is a real, selectable state, not an error.
    it('falls back to every year when the school has none active', async () => {
      const requests: URL[] = [];

      server.use(
        http.get(apiUrl(SCHOOL_YEARS_PATH), () => HttpResponse.json({ data: [year2025] })),
        http.get(apiUrl(BATCHES_PATH), ({ request }) => {
          requests.push(new URL(request.url));
          return HttpResponse.json({ data: billable });
        }),
      );

      renderDialog();
      await screen.findByText('Pedro Silva');

      expect(requests[requests.length - 1]?.searchParams.get('school_year_id')).toBeNull();
      expect(screen.getByRole('combobox', { name: 'Ano letivo' })).toHaveTextContent(
        'Todos os anos',
      );
    });
  });

  // A tagged row has contract history — a cancelled contract, an unsigned replacement, or both at
  // once — but nothing billable right now. Distinct from `withoutContract`, which has no history
  // at all; neither can be ticked, but they read differently to staff.
  describe('a student with contract history but nothing billable', () => {
    const withTagged = [...billable, tagged];

    it('shows both tags together, never the "without contract" chip', async () => {
      server.use(http.get(apiUrl(BATCHES_PATH), () => HttpResponse.json({ data: withTagged })));

      renderDialog();

      const row = (await screen.findByText('Diana Rocha')).closest('[role="row"]') as HTMLElement;

      expect(within(row).getByText('Contrato cancelado')).toBeInTheDocument();
      expect(within(row).getByText('Aguardando assinatura')).toBeInTheDocument();
      expect(within(row).queryByText('Sem contrato')).not.toBeInTheDocument();
      expect(within(row).queryByText(/R\$/)).not.toBeInTheDocument();
    });

    it('cannot be ticked, is left out of the totals, and gets its own hint', async () => {
      server.use(http.get(apiUrl(BATCHES_PATH), () => HttpResponse.json({ data: withTagged })));

      renderDialog();

      const row = (await screen.findByText('Diana Rocha')).closest('[role="row"]') as HTMLElement;

      expect(within(row).getByRole('checkbox')).toBeDisabled();
      // Same two billable contracts as before; the tagged student adds nothing.
      await screen.findByText(/2 contrato\(s\) selecionado\(s\)/);
      expect(screen.getByText(/R\$\s?1\.450,00/)).toBeInTheDocument();
      expect(
        screen.getByText(/1 aluno\(s\) têm um contrato cancelado ou ainda aguardando assinatura/),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/Alunos sem contrato não podem receber boleto/),
      ).not.toBeInTheDocument();
    });
  });
});
