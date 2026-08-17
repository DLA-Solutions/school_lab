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
const PREFILL_PATH = `${CONTRACTS_PATH}/prefill`;
const previewPath = (id: number) => `${CONTRACTS_PATH}/${id}/preview`;
const DRAFT_PREVIEW_PATH = `${CONTRACTS_PATH}/preview_draft`;

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
  signature_cancelled_at: null,
  signature_provider: 'autentique',
  signature_requested_at: '2026-01-02T12:00:00Z',
  sent_to_provider: true,
  signed_document_url: 'https://api.autentique.com.br/documentos/doc-abc-123/assinado.pdf',
  plan_discount_id: null,
  payer_guardian_id: null,
  payer_name: 'Maria Silva',
};

const pendingContract: Contract = {
  ...signedContract,
  id: 92,
  signature_status: 'pending_signature',
  signed_at: null,
  // Nothing to link to until the family has signed it.
  signed_document_url: null,
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
  {
    id: 3,
    school_id: SCHOOL_ID,
    name: 'Mensalidade Integral',
    plan_type: 'tuition',
    base_amount_cents: 90_000,
  },
]);

const discounts = page([
  { id: 7, school_id: SCHOOL_ID, name: 'Desconto 10%', percent: 10, in_use: false },
]);

// The option label now carries the plan's full price alongside its name.
const PLAN_OPTION = /Mensalidade Integral/;

/**
 * What the API reports about the chosen child. Two plans exist in these fixtures' school, so the
 * prefill suggests none — picking the plan stays the operator's call.
 */
const prefill = {
  student: {
    id: 12,
    name: 'Pedro Silva',
    cpf: '52998224725',
    rg: 'MG-14.235.789',
    birth_date: '2015-03-10',
    school_class_name: 'A',
    grade_level: 'fundamental_i_5',
    year: 2026,
  },
  guardians: [
    {
      id: 7,
      name: 'Maria Silva',
      cpf: '12345678909',
      email: 'maria@example.com',
      phone: null,
      relationship: 'mother' as const,
      primary_guardian: true,
      can_sign: true,
      missing: [],
    },
  ],
  suggested: {
    payer_guardian_id: 7,
    billing_plan_id: null,
    plan_discount_id: null,
    negotiated_amount_cents: null,
    due_day: 5,
    starts_on: '2026-01-01',
  },
  blocking_issues: [],
  warnings: [],
};

/** The form's selects are always loaded; specs override the contract list per case. */
const stubFormOptions = () => {
  server.use(
    http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.json(students)),
    http.get(apiUrl(PLANS_PATH), () => HttpResponse.json(plans)),
    http.get(apiUrl(DISCOUNTS_PATH), () => HttpResponse.json(discounts)),
    http.get(apiUrl(PREFILL_PATH), () => HttpResponse.json({ data: prefill })),
    http.post(apiUrl(DRAFT_PREVIEW_PATH), () =>
      HttpResponse.json({ data: { html: '<p>Contrato</p>', filename: 'contrato.html' } }),
    ),
    http.get(apiUrl(previewPath(pendingContract.id)), () =>
      HttpResponse.json({ data: { html: '<p>Contrato</p>', filename: 'contrato.html' } }),
    ),
    http.get(apiUrl(previewPath(undispatchedContract.id)), () =>
      HttpResponse.json({ data: { html: '<p>Contrato</p>', filename: 'contrato.html' } }),
    ),
    http.get(apiUrl(previewPath(signedContract.id)), () =>
      HttpResponse.json({ data: { html: '<p>Contrato</p>', filename: 'contrato.html' } }),
    ),
  );
};

/** The form's own submit — it only renders the draft; nothing is recorded by it. */
const submitButton = () => screen.getByRole('button', { name: /gerar contrato/i });

/** Generating leaves the school in the preview; sending from there is what creates anything. */
const sendFromPreview = async () => {
  await user.click(submitButton());
  await screen.findByTitle('Contrato');
  await user.click(screen.getByRole('button', { name: 'Enviar para assinatura' }));
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

    expect(await screen.findByRole('button', { name: /pré-visualizar/i })).toBeInTheDocument();
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
    await user.click(screen.getByRole('option', { name: PLAN_OPTION }));
    fireEvent.change(screen.getByRole('textbox', { name: /mensalidade/i }), {
      target: { value: '85000' },
    });

    await sendFromPreview();

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

  it('lands on the pending tab once the contract was sent, since that is where it goes', async () => {
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
    await user.click(screen.getByRole('option', { name: PLAN_OPTION }));
    fireEvent.change(screen.getByRole('textbox', { name: /mensalidade/i }), {
      target: { value: '85000' },
    });

    await user.click(submitButton());

    expect(await screen.findByText(/pré-visualização do contrato/i)).toBeInTheDocument();

    // Sending closes the preview by itself: the draft became a contract and the school is back
    // on the listing that now holds it.
    await user.click(screen.getByRole('button', { name: 'Enviar para assinatura' }));

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /aguardando assinatura/i })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
    expect(await screen.findByRole('button', { name: /pré-visualizar/i })).toBeInTheDocument();
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
    );

    renderDialog();
    await screen.findByText(/nenhum contrato assinado/i);

    await user.click(screen.getByRole('combobox', { name: /filho/i }));
    await user.click(screen.getByRole('option', { name: 'Pedro Silva' }));
    await user.click(screen.getByRole('combobox', { name: /plano/i }));
    await user.click(screen.getByRole('option', { name: PLAN_OPTION }));
    await user.click(screen.getByRole('combobox', { name: /desconto/i }));
    await user.click(screen.getByRole('option', { name: 'Desconto 10%' }));

    await sendFromPreview();

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

    await user.click(submitButton());

    expect(await screen.findByText(/selecione o filho/i)).toBeInTheDocument();
    expect(screen.getByText(/selecione o plano/i)).toBeInTheDocument();
    expect(screen.getByText(/informe o valor da mensalidade/i)).toBeInTheDocument();
  });

  // Generating is reading, not committing: every attempt the school decides against would
  // otherwise pile up in the listing as a contract nobody meant to keep.
  it('records nothing when a draft is generated', async () => {
    authenticate();
    stubFormOptions();

    let created = false;
    server.use(
      http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([]))),
      http.post(apiUrl(CONTRACTS_PATH), () => {
        created = true;
        return HttpResponse.json({ data: pendingContract }, { status: 201 });
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

    await user.click(submitButton());

    // The preview opens instead, showing the agreement as the family would receive it.
    expect(await screen.findByTitle('Contrato')).toBeInTheDocument();
    expect(created).toBe(false);
  });

  // A refused send leaves nothing behind — the API discards the contract — so the school gets the
  // reason back on the form it can still fix, rather than a row it never managed to send.
  it('keeps the draft out of the listing when the send fails', async () => {
    authenticate();
    stubFormOptions();

    server.use(
      http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([]))),
      http.post(apiUrl(CONTRACTS_PATH), () =>
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

    await sendFromPreview();

    expect(await screen.findByText(/nenhuma integração de assinatura/i)).toBeInTheDocument();
    // The form is still filled in, so the school fixes what was wrong and sends again. The
    // preview gives way to it — the banner lives on the dialog behind.
    expect(await screen.findByRole('textbox', { name: /mensalidade/i })).toHaveValue('850,00');
  });

  // The contract must survive a provider outage: it exists and can be sent again.
  it('keeps the contract and explains when the send fails', async () => {
    authenticate();
    stubFormOptions();

    server.use(
      http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([undispatchedContract]))),
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
    await user.click(await screen.findByRole('tab', { name: /aguardando assinatura/i }));

    await user.click(await screen.findByRole('button', { name: 'Enviar para assinatura' }));

    expect(await screen.findByText(/nenhuma integração de assinatura/i)).toBeInTheDocument();
    expect(screen.getByText('Não enviado')).toBeInTheDocument();
  });

  // A contract that never reached the provider is waiting on the school, not on the family.
  it('marks an undispatched contract as not sent and offers to send it', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Enviar para assinatura' }));

    await waitFor(() => expect(resent).toBe(true));
  });

  it('blocks sending when the guardian has no linked children', async () => {
    authenticate();
    server.use(
      http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([]))),
      http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.json(page([]))),
      http.get(apiUrl(PLANS_PATH), () => HttpResponse.json(plans)),
    );

    renderDialog();

    expect(await screen.findByText(/não tem filhos vinculados/i)).toBeInTheDocument();
    await waitFor(() => expect(submitButton()).toBeDisabled());
  });
  // Choosing the child is all the operator should have to do; the rest comes off the register.
  it('shows what the register already holds about the chosen child', async () => {
    authenticate();
    stubFormOptions();
    server.use(http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([]))));

    renderDialog();
    await screen.findByText(/nenhum contrato assinado/i);

    await user.click(screen.getByRole('combobox', { name: /filho/i }));
    await user.click(screen.getByRole('option', { name: 'Pedro Silva' }));

    expect(await screen.findByText(/dados que entram no contrato/i)).toBeInTheDocument();
    expect(screen.getByText('529.982.247-25')).toBeInTheDocument();
    expect(screen.getByText('MG-14.235.789')).toBeInTheDocument();
    expect(screen.getByText(/Mãe: Maria Silva/)).toBeInTheDocument();
    expect(screen.getByText('Pode assinar')).toBeInTheDocument();
  });

  // Autentique reaches a signer by e-mail and identifies them by CPF. Learning that from a
  // rejected upload, with a family already expecting the contract, is late.
  it('names a guardian who cannot sign before anything is created', async () => {
    authenticate();
    stubFormOptions();
    server.use(
      http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([]))),
      http.get(apiUrl(PREFILL_PATH), () =>
        HttpResponse.json({
          data: {
            ...prefill,
            guardians: [
              { ...prefill.guardians[0], email: null, can_sign: false, missing: ['email'] },
            ],
            blocking_issues: ['Sem e-mail ou CPF para Maria Silva.'],
          },
        }),
      ),
    );

    renderDialog();
    await screen.findByText(/nenhum contrato assinado/i);

    await user.click(screen.getByRole('combobox', { name: /filho/i }));
    await user.click(screen.getByRole('option', { name: 'Pedro Silva' }));

    expect(await screen.findByText(/sem e-mail ou cpf para maria silva/i)).toBeInTheDocument();
    expect(screen.getByText('Cadastro incompleto')).toBeInTheDocument();
  });

  // Reading the document is never destructive, so it is offered whatever state the contract is in.
  it('opens the agreement for reading from a row, without sending it', async () => {
    authenticate();
    stubFormOptions();

    let dispatched = false;
    server.use(
      http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([undispatchedContract]))),
      http.post(apiUrl(`${CONTRACTS_PATH}/${undispatchedContract.id}/send_for_signature`), () => {
        dispatched = true;
        return HttpResponse.json({ data: pendingContract });
      }),
    );

    renderDialog();
    await user.click(await screen.findByRole('tab', { name: /aguardando assinatura/i }));

    await user.click(await screen.findByRole('button', { name: /pré-visualizar/i }));

    expect(await screen.findByTitle('Contrato')).toBeInTheDocument();
    expect(dispatched).toBe(false);
  });
  // A signed contract is the one people most often need to reread; hiding the preview once it was
  // signed meant the only copy on screen was gone exactly when it mattered.
  it('still reads a contract that has already been signed', async () => {
    authenticate();
    stubFormOptions();
    server.use(http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([signedContract]))));

    renderDialog();

    await user.click(await screen.findByRole('button', { name: /pré-visualizar/i }));

    expect(await screen.findByTitle('Contrato')).toBeInTheDocument();
  });

  // Two different documents: our render of what was sent, and the provider's file with the
  // signature page appended. The second is the one that proves anything.
  // The provider's URL is served only against the school's API token, so a link straight to it
  // answers 403 in a browser. It used to be offered here, and it never worked.
  it('never links straight to the provider URL, which answers 403', async () => {
    authenticate();
    stubFormOptions();
    server.use(http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([signedContract]))));

    renderDialog();
    await screen.findByRole('button', { name: /pré-visualizar/i });

    const toProvider = screen
      .queryAllByRole('link')
      .filter((link) => link.getAttribute('href') === signedContract.signed_document_url);
    expect(toProvider).toHaveLength(0);
  });

  it('reads and downloads the signed file from inside the preview', async () => {
    authenticate();
    stubFormOptions();
    server.use(
      http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([signedContract]))),
      http.get(apiUrl(`${CONTRACTS_PATH}/${signedContract.id}/signed_document`), () =>
        HttpResponse.arrayBuffer(new TextEncoder().encode('%PDF-1.4').buffer, {
          headers: { 'Content-Type': 'application/pdf' },
        }),
      ),
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock/1');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    renderDialog();
    await user.click(await screen.findByRole('button', { name: /pré-visualizar/i }));

    expect(await screen.findByTitle('Contrato assinado')).toHaveAttribute('src', 'blob:mock/1');
    expect(screen.getByRole('button', { name: 'Baixar PDF assinado' })).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  // A contract goes out with a wrong figure, or a family decides not to go ahead. Either way the
  // school has to stop it before anyone signs.
  describe('calling off a contract sent for signature', () => {
    const listPending = (rows: Contract[]) =>
      http.get(apiUrl(CONTRACTS_PATH), ({ request }) => {
        const status = new URL(request.url).searchParams.get('signature_status');
        return HttpResponse.json(page(status === 'pending_signature' ? rows : []));
      });

    it('cancels it after the school confirms', async () => {
      let cancelled = false;
      authenticate();
      stubFormOptions();
      server.use(
        listPending([pendingContract]),
        http.post(apiUrl(`${CONTRACTS_PATH}/${pendingContract.id}/cancel_signature`), () => {
          cancelled = true;
          return HttpResponse.json({
            data: { ...pendingContract, signature_status: 'cancelled' },
          });
        }),
      );

      renderDialog();
      await user.click(await screen.findByRole('tab', { name: /aguardando assinatura/i }));
      await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
      await user.click(await screen.findByRole('button', { name: 'Cancelar contrato' }));

      await waitFor(() => expect(cancelled).toBe(true));
    });

    // Cancelling withdraws the document at the provider, so it is confirmed rather than done on
    // a single click.
    it('cancels nothing until the school confirms', async () => {
      let cancelled = false;
      authenticate();
      stubFormOptions();
      server.use(
        listPending([pendingContract]),
        http.post(apiUrl(`${CONTRACTS_PATH}/${pendingContract.id}/cancel_signature`), () => {
          cancelled = true;
          return HttpResponse.json({ data: pendingContract });
        }),
      );

      renderDialog();
      await user.click(await screen.findByRole('tab', { name: /aguardando assinatura/i }));
      await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
      await user.click(await screen.findByRole('button', { name: 'Manter' }));

      expect(cancelled).toBe(false);
    });

    // A signed contract is an agreement in force; undoing it is a rescission, not a button here.
    it('offers no cancel action on a signed contract', async () => {
      authenticate();
      stubFormOptions();
      server.use(http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([signedContract]))));

      renderDialog();
      await screen.findByRole('button', { name: /pré-visualizar/i });

      expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    });

    it('lists what was cancelled under its own tab', async () => {
      const cancelledContract: Contract = {
        ...pendingContract,
        id: 94,
        signature_status: 'cancelled',
        signature_cancelled_at: '2026-08-16T12:00:00Z',
      };
      authenticate();
      stubFormOptions();
      server.use(
        http.get(apiUrl(CONTRACTS_PATH), ({ request }) => {
          const status = new URL(request.url).searchParams.get('signature_status');
          return HttpResponse.json(page(status === 'cancelled' ? [cancelledContract] : []));
        }),
      );

      renderDialog();
      await user.click(await screen.findByRole('tab', { name: /cancelados/i }));

      expect(await screen.findByText('Cancelado')).toBeInTheDocument();
    });

    // The document is still out there collecting signatures, so the contract must not read as
    // cancelled on our side alone.
    it('reports a provider refusal instead of showing it as cancelled', async () => {
      authenticate();
      stubFormOptions();
      server.use(
        listPending([pendingContract]),
        http.post(apiUrl(`${CONTRACTS_PATH}/${pendingContract.id}/cancel_signature`), () =>
          HttpResponse.json(
            {
              error: {
                code: 'provider_error',
                message: 'Não foi possível cancelar o documento na Autentique.',
                details: {},
              },
            },
            { status: 422 },
          ),
        ),
      );

      renderDialog();
      await user.click(await screen.findByRole('tab', { name: /aguardando assinatura/i }));
      await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
      await user.click(await screen.findByRole('button', { name: 'Cancelar contrato' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/Autentique/);
    });
  });

  // Nothing to sign a second time, and nothing left to send.
  it('offers no send action on a signed contract', async () => {
    authenticate();
    stubFormOptions();
    server.use(http.get(apiUrl(CONTRACTS_PATH), () => HttpResponse.json(page([signedContract]))));

    renderDialog();
    await screen.findByRole('button', { name: /pré-visualizar/i });

    expect(
      screen.queryByRole('button', { name: 'Enviar para assinatura' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /marcar assinado/i })).not.toBeInTheDocument();
  });
});
