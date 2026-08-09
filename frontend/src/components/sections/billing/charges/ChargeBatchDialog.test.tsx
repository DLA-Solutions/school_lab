import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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
    student_name: 'Pedro Silva',
    payer: { id: 7, name: 'Maria Silva', cpf: '12345678909' },
    monthly_amount_cents: 85_000,
    due_day: 10,
    already_charged: false,
  },
  {
    contract_id: 92,
    student_name: 'Ana Silva',
    payer: { id: 7, name: 'Maria Silva', cpf: '12345678909' },
    monthly_amount_cents: 60_000,
    due_day: 5,
    already_charged: false,
  },
  {
    contract_id: 93,
    student_name: 'Bruno Costa',
    payer: { id: 8, name: 'Carla Costa', cpf: '98765432100' },
    monthly_amount_cents: 70_000,
    due_day: 10,
    already_charged: true,
  },
];

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

    const checkbox = await screen.findByRole('checkbox', {
      name: 'Selecionar contrato de Bruno Costa',
    });

    expect(checkbox).toBeDisabled();
    expect(screen.getByText('Já cobrado nesta competência')).toBeInTheDocument();
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
    expect(body).toMatchObject({ contract_ids: [91, 92], due_date: null });
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
});
