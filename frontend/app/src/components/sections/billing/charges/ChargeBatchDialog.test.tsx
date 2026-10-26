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
import { BillableContract } from 'types/charge';
import ChargeBatchDialog from './ChargeBatchDialog';

const BATCHES_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/charge_batches`;

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
});
