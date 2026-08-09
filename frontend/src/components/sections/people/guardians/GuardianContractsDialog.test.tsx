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

const user = userEvent.setup({ delay: null });

const guardian: Guardian = {
  id: 7,
  school_id: SCHOOL_ID,
  user_id: null,
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
};

const pendingContract: Contract = {
  ...signedContract,
  id: 92,
  signature_status: 'pending_signature',
  signed_at: null,
};

const page = <T,>(data: T[]) => ({ data, meta: { page: 1, per_page: 25, total: data.length } });

const students = page([
  { id: 12, school_id: SCHOOL_ID, name: 'Pedro Silva' },
  { id: 13, school_id: SCHOOL_ID, name: 'Ana Silva' },
]);

const plans = page([
  { id: 3, school_id: SCHOOL_ID, name: 'Mensalidade Integral', plan_type: 'tuition', base_amount_cents: 90_000 },
]);

/** The form's two selects are always loaded; specs override the contract list per case. */
const stubFormOptions = () => {
  server.use(
    http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.json(students)),
    http.get(apiUrl(PLANS_PATH), () => HttpResponse.json(plans)),
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
    );

    renderDialog();
    await screen.findByText(/nenhum contrato assinado/i);

    await user.click(screen.getByRole('combobox', { name: /filho/i }));
    await user.click(screen.getByRole('option', { name: 'Pedro Silva' }));
    await user.click(screen.getByRole('combobox', { name: /plano/i }));
    await user.click(screen.getByRole('option', { name: 'Mensalidade Integral' }));
    fireEvent.change(screen.getByRole('textbox', { name: /mensalidade/i }), { target: { value: '85000' } });

    await user.click(screen.getByRole('button', { name: /enviar contrato/i }));

    await waitFor(() => expect(received).toBeDefined());

    // The API keeps money as integer cents; "850,00" in the field is 85000 on the wire.
    expect(received?.contract).toEqual({
      student_id: 12,
      billing_plan_id: 3,
      negotiated_amount_cents: 85_000,
      due_day: 10,
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
    );

    renderDialog();
    await screen.findByText(/nenhum contrato assinado/i);

    await user.click(screen.getByRole('combobox', { name: /filho/i }));
    await user.click(screen.getByRole('option', { name: 'Pedro Silva' }));
    await user.click(screen.getByRole('combobox', { name: /plano/i }));
    await user.click(screen.getByRole('option', { name: 'Mensalidade Integral' }));
    fireEvent.change(screen.getByRole('textbox', { name: /mensalidade/i }), { target: { value: '85000' } });

    await user.click(screen.getByRole('button', { name: /enviar contrato/i }));

    expect(await screen.findByRole('button', { name: /marcar assinado/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /aguardando assinatura/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('requires a child, a plan and an amount before sending', async () => {
    authenticate();
    stubFormOptions();
    server.use(http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([]))));

    renderDialog();
    await screen.findByText(/nenhum contrato assinado/i);

    await user.click(screen.getByRole('button', { name: /enviar contrato/i }));

    expect(await screen.findByText(/selecione o filho/i)).toBeInTheDocument();
    expect(screen.getByText(/selecione o plano/i)).toBeInTheDocument();
    expect(screen.getByText(/informe o valor da mensalidade/i)).toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: /enviar contrato/i })).toBeDisabled(),
    );
  });
});
