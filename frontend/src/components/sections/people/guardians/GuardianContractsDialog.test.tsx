import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import { Contract } from 'types/contract';
import { Guardian } from 'types/guardian';
import GuardianContractsDialog from './GuardianContractsDialog';

const CONTRACTS_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/contracts`;
const STUDENTS_PATH = `/api/v1/schools/${SCHOOL_ID}/people/students`;
const PLANS_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/plans`;
const DISCOUNTS_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/plan_discounts`;

const user = userEvent.setup({ delay: null });

const guardian: Guardian = {
  id: 7,
  school_id: SCHOOL_ID,
  user_id: null,
  active: true,
  name: 'Maria Silva',
  cpf: '12345678909',
  email: 'maria@example.com',
  phone: '+55 11 99999-0000',
  zip_code: '01310100',
  street: 'Avenida Paulista',
  number: '1000',
  complement: null,
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
};

const signedContract: Contract = {
  id: 91,
  school_id: SCHOOL_ID,
  student_id: 12,
  student_name: 'Pedro Silva',
  billing_plan_id: 3,
  negotiated_amount_cents: 85_000,
  due_day: 10,
  starts_on: '2026-01-01',
  ends_on: null,
  status: 'active',
  signature_status: 'signed',
  sent_at: '2026-01-02T12:00:00Z',
  signed_at: '2026-01-05T12:00:00Z',
  signature_provider: 'autentique',
  signature_requested_at: '2026-01-02T12:00:00Z',
  sent_to_provider: true,
  plan_discount_id: null,
  payer_guardian_id: null,
  payer_name: 'Maria Silva',
};

const pendingContract: Contract = {
  ...signedContract,
  id: 92,
  signature_status: 'pending_signature',
  signed_at: null,
};

/** Recorded but never dispatched — waiting on the school, not on the family. */
const undispatchedContract: Contract = {
  ...pendingContract,
  id: 93,
  sent_at: null,
  signature_provider: null,
  signature_requested_at: null,
  sent_to_provider: false,
};

const page = <T,>(data: T[]) => ({ data, meta: { page: 1, per_page: 25, total: data.length } });

const students = page([
  { id: 12, school_id: SCHOOL_ID, name: 'Pedro Silva' },
  { id: 13, school_id: SCHOOL_ID, name: 'Ana Silva' },
]);

const plans = page([
  { id: 3, school_id: SCHOOL_ID, name: 'Mensalidade Integral', plan_type: 'tuition', base_amount_cents: 90_000 },
]);

const discounts = page([
  { id: 7, school_id: SCHOOL_ID, name: 'Desconto 10%', percent: 10, in_use: false },
]);

// The option label now carries the plan's full price alongside its name.
const PLAN_OPTION = /Mensalidade Integral/;

/** The form's selects are always loaded; specs override the contract list per case. */
const stubFormOptions = () => {
  server.use(
    http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.json(students)),
    http.get(apiUrl(PLANS_PATH), () => HttpResponse.json(plans)),
    http.get(apiUrl(DISCOUNTS_PATH), () => HttpResponse.json(discounts)),
  );
};

const renderDialog = () => {
  const onClose = vi.fn();

  renderWithTheme(
    <GuardianContractsDialog open schoolId={SCHOOL_ID} guardian={guardian} onClose={onClose} />,
  );

  return { onClose };
};

const authenticate = () => setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

describe('GuardianContractsDialog', () => {
  it('opens on the signed contracts of this guardian only', async () => {
    authenticate();
    stubFormOptions();

    let requestedUrl = '';
    server.use(
      http.get(apiUrl(CONTRACTS_PATH), ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json(page([signedContract]));
      }),
    );

    renderDialog();

    expect(await screen.findByText('Pedro Silva')).toBeInTheDocument();

    const query = new URL(requestedUrl).searchParams;
    expect(query.get('guardian_id')).toBe(String(guardian.id));
    expect(query.get('signature_status')).toBe('signed');
  });

  it('switches to the contracts still awaiting signature', async () => {
    authenticate();
    stubFormOptions();

    const requested: (string | null)[] = [];
    server.use(
      http.get(apiUrl(CONTRACTS_PATH), ({ request }) => {
        const status = new URL(request.url).searchParams.get('signature_status');
        requested.push(status);
        return HttpResponse.json(page(status === 'signed' ? [signedContract] : [pendingContract]));
      }),
    );

    renderDialog();
    await screen.findByText('Pedro Silva');

    await user.click(screen.getByRole('tab', { name: /aguardando assinatura/i }));

    expect(await screen.findByRole('button', { name: /marcar assinado/i })).toBeInTheDocument();
    expect(requested).toContain('pending_signature');
  });

  it('offers only the children linked to this guardian', async () => {
    authenticate();
    stubFormOptions();
    server.use(http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([]))));

    renderDialog();
    await screen.findByText(/nenhum contrato assinado/i);

    await user.click(screen.getByRole('combobox', { name: /filho/i }));

    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Pedro Silva', 'Ana Silva']);
  });

  it('sends a contract with the tuition converted to cents', async () => {
    authenticate();
    stubFormOptions();

    let received: { contract: Record<string, unknown> } | undefined;
    server.use(
      http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([]))),
      http.post(apiUrl(CONTRACTS_PATH), async ({ request }) => {
        received = (await request.json()) as { contract: Record<string, unknown> };
        return HttpResponse.json({ data: pendingContract }, { status: 201 });
      }),
      http.post(apiUrl(`${CONTRACTS_PATH}/${pendingContract.id}/send_for_signature`), () =>
        HttpResponse.json({ data: pendingContract }),
      ),
    );

    renderDialog();
    await screen.findByText(/nenhum contrato assinado/i);

    await user.click(screen.getByRole('combobox', { name: /filho/i }));
    await user.click(screen.getByRole('option', { name: 'Pedro Silva' }));
    await user.click(screen.getByRole('combobox', { name: /plano/i }));
    await user.click(screen.getByRole('option', { name: PLAN_OPTION }));
    fireEvent.change(screen.getByRole('textbox', { name: /mensalidade/i }), { target: { value: '85000' } });

    await user.click(screen.getByRole('button', { name: /enviar para assinatura/i }));

    await waitFor(() => expect(received).toBeDefined());

    // The API keeps money as integer cents; "850,00" in the field is 85000 on the wire.
    expect(received?.contract).toEqual({
      student_id: 12,
      billing_plan_id: 3,
      plan_discount_id: null,
      // The dialog belongs to this guardian, so the boletos go out on their CPF by default.
      payer_guardian_id: guardian.id,
      negotiated_amount_cents: 85_000,
      // The 5th is the school's usual due date and the form's default.
      due_day: 5,
    });
  });

  it('lands on the pending tab after sending, since that is where the contract goes', async () => {
    authenticate();
    stubFormOptions();

    server.use(
      http.get(apiUrl(CONTRACTS_PATH), ({ request }) => {
        const status = new URL(request.url).searchParams.get('signature_status');
        return HttpResponse.json(page(status === 'pending_signature' ? [pendingContract] : []));
      }),
      http.post(apiUrl(CONTRACTS_PATH), () =>
        HttpResponse.json({ data: pendingContract }, { status: 201 }),
      ),
      http.post(apiUrl(`${CONTRACTS_PATH}/${pendingContract.id}/send_for_signature`), () =>
        HttpResponse.json({ data: pendingContract }),
      ),
    );

    renderDialog();
    await screen.findByText(/nenhum contrato assinado/i);

    await user.click(screen.getByRole('combobox', { name: /filho/i }));
    await user.click(screen.getByRole('option', { name: 'Pedro Silva' }));
    await user.click(screen.getByRole('combobox', { name: /plano/i }));
    await user.click(screen.getByRole('option', { name: PLAN_OPTION }));
    fireEvent.change(screen.getByRole('textbox', { name: /mensalidade/i }), { target: { value: '85000' } });

    await user.click(screen.getByRole('button', { name: /enviar para assinatura/i }));

    expect(await screen.findByRole('button', { name: /marcar assinado/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /aguardando assinatura/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  // The amount follows the plan's full price and the band granted, so it is explainable rather
  // than typed from memory.
  it('computes the tuition from the plan and the discount', async () => {
    authenticate();
    stubFormOptions();
    server.use(http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([]))));

    renderDialog();
    await screen.findByText(/nenhum contrato assinado/i);

    await user.click(screen.getByRole('combobox', { name: /plano/i }));
    await user.click(screen.getByRole('option', { name: PLAN_OPTION }));

    // Full price, no band yet.
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /mensalidade/i })).toHaveValue('900,00'),
    );

    await user.click(screen.getByRole('combobox', { name: /desconto/i }));
    await user.click(screen.getByRole('option', { name: 'Desconto 10%' }));

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /mensalidade/i })).toHaveValue('810,00'),
    );
  });

  it('sends the granted band along with the contract', async () => {
    authenticate();
    stubFormOptions();

    let received: { contract: Record<string, unknown> } | undefined;
    server.use(
      http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([]))),
      http.post(apiUrl(CONTRACTS_PATH), async ({ request }) => {
        received = (await request.json()) as { contract: Record<string, unknown> };
        return HttpResponse.json({ data: pendingContract }, { status: 201 });
      }),
      http.post(apiUrl(`${CONTRACTS_PATH}/${pendingContract.id}/send_for_signature`), () =>
        HttpResponse.json({ data: pendingContract }),
      ),
    );

    renderDialog();
    await screen.findByText(/nenhum contrato assinado/i);

    await user.click(screen.getByRole('combobox', { name: /filho/i }));
    await user.click(screen.getByRole('option', { name: 'Pedro Silva' }));
    await user.click(screen.getByRole('combobox', { name: /plano/i }));
    await user.click(screen.getByRole('option', { name: PLAN_OPTION }));
    await user.click(screen.getByRole('combobox', { name: /desconto/i }));
    await user.click(screen.getByRole('option', { name: 'Desconto 10%' }));

    await user.click(screen.getByRole('button', { name: /enviar para assinatura/i }));

    await waitFor(() => expect(received).toBeDefined());
    expect(received?.contract.plan_discount_id).toBe(7);
    expect(received?.contract.negotiated_amount_cents).toBe(81_000);
  });

  it('requires a child, a plan and an amount before sending', async () => {
    authenticate();
    stubFormOptions();
    server.use(http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([]))));

    renderDialog();
    await screen.findByText(/nenhum contrato assinado/i);

    await user.click(screen.getByRole('button', { name: /enviar para assinatura/i }));

    expect(await screen.findByText(/selecione o filho/i)).toBeInTheDocument();
    expect(screen.getByText(/selecione o plano/i)).toBeInTheDocument();
    expect(screen.getByText(/informe o valor da mensalidade/i)).toBeInTheDocument();
  });

  // Creating the contract and dispatching it are separate calls: the second is what puts the
  // agreement in the family's inbox.
  it('dispatches the contract to the provider right after creating it', async () => {
    authenticate();
    stubFormOptions();

    let dispatched = false;
    server.use(
      http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([]))),
      http.post(apiUrl(CONTRACTS_PATH), () =>
        HttpResponse.json({ data: pendingContract }, { status: 201 }),
      ),
      http.post(apiUrl(`${CONTRACTS_PATH}/${pendingContract.id}/send_for_signature`), () => {
        dispatched = true;
        return HttpResponse.json({ data: pendingContract });
      }),
    );

    renderDialog();
    await screen.findByText(/nenhum contrato assinado/i);

    await user.click(screen.getByRole('combobox', { name: /filho/i }));
    await user.click(screen.getByRole('option', { name: 'Pedro Silva' }));
    await user.click(screen.getByRole('combobox', { name: /plano/i }));
    await user.click(screen.getByRole('option', { name: PLAN_OPTION }));
    fireEvent.change(screen.getByRole('textbox', { name: /mensalidade/i }), {
      target: { value: '85000' },
    });

    await user.click(screen.getByRole('button', { name: /enviar para assinatura/i }));

    await waitFor(() => expect(dispatched).toBe(true));
  });

  // The contract must survive a provider outage: it exists and can be resent.
  it('keeps the contract and explains when the dispatch fails', async () => {
    authenticate();
    stubFormOptions();

    server.use(
      // The dialog opens on the signed tab, which must be empty for the form to be reachable.
      http.get(apiUrl(CONTRACTS_PATH), ({ request }) => {
        const status = new URL(request.url).searchParams.get('signature_status');
        return HttpResponse.json(page(status === 'pending_signature' ? [undispatchedContract] : []));
      }),
      http.post(apiUrl(CONTRACTS_PATH), () =>
        HttpResponse.json({ data: undispatchedContract }, { status: 201 }),
      ),
      http.post(apiUrl(`${CONTRACTS_PATH}/${undispatchedContract.id}/send_for_signature`), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Dados inválidos.',
              details: { base: ['Nenhuma integração de assinatura configurada para esta escola.'] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    renderDialog();
    await screen.findByText(/nenhum contrato assinado/i);

    await user.click(screen.getByRole('combobox', { name: /filho/i }));
    await user.click(screen.getByRole('option', { name: 'Pedro Silva' }));
    await user.click(screen.getByRole('combobox', { name: /plano/i }));
    await user.click(screen.getByRole('option', { name: PLAN_OPTION }));
    fireEvent.change(screen.getByRole('textbox', { name: /mensalidade/i }), {
      target: { value: '85000' },
    });

    await user.click(screen.getByRole('button', { name: /enviar para assinatura/i }));

    expect(await screen.findByText(/nenhuma integração de assinatura/i)).toBeInTheDocument();
  });

  // A contract that never reached the provider is waiting on the school, not on the family.
  it('marks an undispatched contract as not sent and offers to resend it', async () => {
    authenticate();
    stubFormOptions();

    let resent = false;
    server.use(
      http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([undispatchedContract]))),
      http.post(apiUrl(`${CONTRACTS_PATH}/${undispatchedContract.id}/send_for_signature`), () => {
        resent = true;
        return HttpResponse.json({ data: pendingContract });
      }),
    );

    renderDialog();
    await user.click(await screen.findByRole('tab', { name: /aguardando assinatura/i }));

    expect(await screen.findByText('Não enviado')).toBeInTheDocument();
    expect(screen.getByText(/ainda não enviado para assinatura/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reenviar/i }));

    await waitFor(() => expect(resent).toBe(true));
  });

  it('records a returned contract as signed', async () => {
    authenticate();
    stubFormOptions();

    let signedId: number | null = null;
    server.use(
      http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([pendingContract]))),
      http.post(apiUrl(`${CONTRACTS_PATH}/${pendingContract.id}/sign`), () => {
        signedId = pendingContract.id;
        return HttpResponse.json({ data: { ...pendingContract, signature_status: 'signed' } });
      }),
    );

    renderDialog();

    await user.click(await screen.findByRole('button', { name: /marcar assinado/i }));

    await waitFor(() => expect(signedId).toBe(pendingContract.id));
  });

  // Without a linked child there is nothing to contract, and the API would reject student_id.
  it('blocks sending when the guardian has no linked children', async () => {
    authenticate();
    server.use(
      http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([]))),
      http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.json(page([]))),
      http.get(apiUrl(PLANS_PATH), () => HttpResponse.json(plans)),
    );

    renderDialog();

    expect(await screen.findByText(/não tem filhos vinculados/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /enviar para assinatura/i })).toBeDisabled(),
    );
  });
});
