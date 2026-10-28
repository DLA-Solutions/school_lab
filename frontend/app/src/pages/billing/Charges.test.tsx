import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import {
  ACCESS_EXPIRES_AT,
  FRESH_ACCESS_TOKEN,
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  http,
  server,
  staffMembership,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import { Charge } from 'types/charge';
import { Guardian } from 'types/guardian';
import Charges from './Charges';

const CHARGES_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/charges`;
const GUARDIANS_PATH = `/api/v1/schools/${SCHOOL_ID}/people/guardians`;
const CONTRACTS_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/contracts`;

const user = userEvent.setup({ delay: null });

const maria: Guardian = {
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

/** A one-off the school raised outside any contract, so it answers to no student. */
const standaloneCharge: Charge = {
  id: 501,
  billing_period: '2026-09-01',
  original_amount_cents: 7_500,
  discount_amount_cents: 0,
  late_fee_amount_cents: 0,
  total_amount_cents: 7_500,
  due_date: '2026-09-15',
  status: 'pending',
  kind: 'one_off',
  description: 'Aluguel da quadra',
  boleto_url: null,
  payment_methods: {
    boleto_url: null,
    pix_copy_paste: null,
    digitable_line: null,
    boleto_pdf_available: false,
  },
  contract_id: null,
  student: null,
  guardian: { id: 7, name: 'Maria Silva', cpf: '12345678909' },
  source: 'platform',
};

const NO_METHODS = {
  boleto_url: null,
  pix_copy_paste: null,
  digitable_line: null,
  boleto_pdf_available: false,
};

const PIX = '00020126580014br.gov.bcb.pix0136example-pix-code';
const LINE = '07790.00116 12345.678901 23456.789012 3 98760000012000';

/** Banco Inter: no hosted URL; the Pix code, linha digitável and a PDF the API relays. */
const interCharge: Charge = {
  ...standaloneCharge,
  payment_methods: {
    boleto_url: null,
    pix_copy_paste: PIX,
    digitable_line: LINE,
    boleto_pdf_available: true,
  },
};

const staffUser: AuthUser = {
  id: 1,
  email: 'admin@example.com',
  status: 'active',
  memberships: [staffMembership],
  guardian_profiles: [],
};

const authValue: AuthContextValue = {
  user: staffUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const renderPage = () => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <Charges />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

const listingHandlers = (rows: Charge[] = []) => [
  http.get(apiUrl(CHARGES_PATH), () =>
    HttpResponse.json({ data: rows, meta: { page: 1, per_page: 25, total: rows.length } }),
  ),
  http.get(apiUrl(GUARDIANS_PATH), () =>
    HttpResponse.json({ data: [maria], meta: { page: 1, per_page: 25, total: 1 } }),
  ),
  // This guardian has no contract; the form still has to let a boleto out.
  http.get(apiUrl(CONTRACTS_PATH), () =>
    HttpResponse.json({ data: [], meta: { page: 1, per_page: 25, total: 0 } }),
  ),
];

describe('Charges', () => {
  it('lists a charge that belongs to no contract without inventing a student', async () => {
    server.use(...listingHandlers([standaloneCharge]));

    renderPage();

    expect(await screen.findByText('Aluguel da quadra')).toBeInTheDocument();
    expect(screen.getByText('Avulso')).toBeInTheDocument();
  });

  it('raises a one-off against a guardian who has no contract at all', async () => {
    let body: unknown;

    server.use(
      ...listingHandlers(),
      http.post(apiUrl(CHARGES_PATH), async ({ request }) => {
        body = await request.json();

        return HttpResponse.json({ data: standaloneCharge }, { status: 201 });
      }),
    );

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Novo boleto avulso' }));

    const dialog = await screen.findByRole('dialog');

    // One field: type part of a name or a CPF and pick the payer from what comes back.
    await user.type(
      within(dialog).getByRole('combobox', { name: /Respons\u00e1vel que receber\u00e1 o boleto/ }),
      'Maria',
    );
    await user.click(await screen.findByRole('option', { name: /Maria Silva/ }));

    // The API will not take a one-off without saying what it is for.
    await user.click(await within(dialog).findByRole('combobox', { name: /Finalidade da cobran\u00e7a/ }));
    await user.click(await screen.findByRole('option', { name: 'Matr\u00edcula' }));

    await user.type(dialog.querySelector('#charge-amount')!, '7500');
    await user.type(dialog.querySelector('#charge-due-date')!, '2026-09-15');
    await user.click(within(dialog).getByRole('button', { name: 'Gerar boleto' }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({
      charge: {
        guardian_id: 7,
        contract_id: null,
        billing_purpose_id: 2,
        total_amount_cents: 7_500,
      },
    });
  });

  it('asks for the purpose before sending the one-off', async () => {
    let posted = false;

    server.use(
      ...listingHandlers(),
      http.post(apiUrl(CHARGES_PATH), () => {
        posted = true;

        return HttpResponse.json({ data: standaloneCharge }, { status: 201 });
      }),
    );

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Novo boleto avulso' }));
    const dialog = await screen.findByRole('dialog');

    await user.type(
      within(dialog).getByRole('combobox', { name: /Respons\u00e1vel que receber\u00e1 o boleto/ }),
      'Maria',
    );
    await user.click(await screen.findByRole('option', { name: /Maria Silva/ }));
    await user.type(dialog.querySelector('#charge-amount')!, '7500');
    await user.type(dialog.querySelector('#charge-due-date')!, '2026-09-15');
    await user.click(within(dialog).getByRole('button', { name: 'Gerar boleto' }));

    expect(await within(dialog).findByText('Selecione a finalidade da cobran\u00e7a.')).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it('shows the API message for a rejected field instead of the generic one', async () => {
    server.use(
      ...listingHandlers(),
      http.post(apiUrl(CHARGES_PATH), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Dados inv\u00e1lidos.',
              details: { due_date: ['O vencimento n\u00e3o pode estar no passado.'] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Novo boleto avulso' }));
    const dialog = await screen.findByRole('dialog');

    await user.type(
      within(dialog).getByRole('combobox', { name: /Respons\u00e1vel que receber\u00e1 o boleto/ }),
      'Maria',
    );
    await user.click(await screen.findByRole('option', { name: /Maria Silva/ }));
    await user.click(await within(dialog).findByRole('combobox', { name: /Finalidade da cobran\u00e7a/ }));
    await user.click(await screen.findByRole('option', { name: 'Mensalidade' }));
    await user.type(dialog.querySelector('#charge-amount')!, '7500');
    await user.type(dialog.querySelector('#charge-due-date')!, '2026-09-15');
    await user.click(within(dialog).getByRole('button', { name: 'Gerar boleto' }));

    expect(
      await within(dialog).findByText('O vencimento n\u00e3o pode estar no passado.'),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText('Dados inv\u00e1lidos.')).not.toBeInTheDocument();
  });

  it('says so when the purposes cannot be loaded', async () => {
    server.use(
      ...listingHandlers(),
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/billing/purposes`), () =>
        HttpResponse.json(
          { error: { code: 'internal_error', message: 'Erro', details: {} } },
          { status: 500 },
        ),
      ),
    );

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Novo boleto avulso' }));
    const dialog = await screen.findByRole('dialog');

    expect(
      await within(dialog).findByText(/N\u00e3o foi poss\u00edvel carregar as finalidades/),
    ).toBeInTheDocument();
  });

  describe('picking a student before the payer', () => {
    const BILLABLE_STUDENTS_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/billable_students`;

    const pedroRow = {
      student_id: 10,
      student_name: 'Pedro Silva',
      contract_id: 55,
      payer: { id: 7, name: 'Maria Silva', cpf: '12345678909' },
      without_contract: false,
      tags: [],
    };

    // Has contract history, but nothing billable right now \u2014 shown in the picker, never
    // selectable there.
    const diana = {
      student_id: 11,
      student_name: 'Diana Rocha',
      contract_id: null,
      payer: null,
      without_contract: false,
      tags: ['cancelled'],
    };

    const pedroContract = {
      id: 55,
      student_name: 'Pedro Silva',
      negotiated_amount_cents: 85_000,
    };

    it('resolves the payer and contract from the picked student, feeding the existing fields', async () => {
      let body: unknown;

      server.use(
        // These three override `listingHandlers()`'s own GUARDIANS_PATH/CONTRACTS_PATH defaults
        // below \u2014 msw resolves same-route handlers in registration order, so the override has to
        // come first.
        http.get(apiUrl(BILLABLE_STUDENTS_PATH), () =>
          HttpResponse.json({ data: [pedroRow, diana] }),
        ),
        http.get(apiUrl(GUARDIANS_PATH), () =>
          // The picker resolves the family, not a free-text search \u2014 the contract's own payer
          // comes back as the single guardian on file, whatever the query.
          HttpResponse.json({ data: [maria], meta: { page: 1, per_page: 25, total: 1 } }),
        ),
        http.get(apiUrl(CONTRACTS_PATH), () =>
          HttpResponse.json({ data: [pedroContract], meta: { page: 1, per_page: 25, total: 1 } }),
        ),
        http.post(apiUrl(CHARGES_PATH), async ({ request }) => {
          body = await request.json();

          return HttpResponse.json({ data: standaloneCharge }, { status: 201 });
        }),
        ...listingHandlers(),
      );

      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Novo boleto avulso' }));
      const dialog = await screen.findByRole('dialog', { name: 'Novo boleto avulso' });

      await user.click(within(dialog).getByRole('button', { name: 'Selecionar aluno' }));

      const picker = await screen.findByRole('dialog', { name: 'Selecionar aluno' });
      // Diana has contract history but nothing billable \u2014 listed, with her tag, never offered a
      // select action.
      const dianaRow = (await within(picker).findByText('Diana Rocha')).closest(
        '[role="row"]',
      ) as HTMLElement;
      expect(within(dianaRow).getByText('Contrato cancelado')).toBeInTheDocument();
      expect(
        within(dianaRow).queryByRole('button', { name: /Selecionar/ }),
      ).not.toBeInTheDocument();

      await user.click(within(picker).getByRole('button', { name: 'Selecionar Pedro Silva' }));

      // Back on the form: the student is named, the payer and contract came from them. The payer
      // field is an Autocomplete input \u2014 its selection lives in `.value`, not text content.
      expect(await within(dialog).findByText('Aluno: Pedro Silva')).toBeInTheDocument();
      await waitFor(() =>
        expect(
          (within(dialog).getByRole('combobox', { name: /Respons\u00e1vel/ }) as HTMLInputElement)
            .value,
        ).toContain('Maria Silva'),
      );
      await waitFor(() =>
        expect(within(dialog).getByRole('combobox', { name: /Contrato/ })).toHaveTextContent(
          'Pedro Silva',
        ),
      );

      await user.click(within(dialog).getByRole('combobox', { name: /Finalidade da cobran\u00e7a/ }));
      await user.click(await screen.findByRole('option', { name: 'Mensalidade' }));
      await user.type(dialog.querySelector('#charge-amount')!, '7500');
      await user.type(dialog.querySelector('#charge-due-date')!, '2026-09-15');
      await user.click(within(dialog).getByRole('button', { name: 'Gerar boleto' }));

      await waitFor(() => expect(body).toBeDefined());
      expect(body).toMatchObject({
        charge: { guardian_id: 7, contract_id: 55 },
      });
    });

    it('returns to searching a guardian directly when the picker is skipped', async () => {
      server.use(
        ...listingHandlers(),
        http.get(apiUrl(BILLABLE_STUDENTS_PATH), () => HttpResponse.json({ data: [pedroRow] })),
      );

      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Novo boleto avulso' }));
      const dialog = await screen.findByRole('dialog', { name: 'Novo boleto avulso' });

      await user.click(within(dialog).getByRole('button', { name: 'Selecionar aluno' }));
      const picker = await screen.findByRole('dialog', { name: 'Selecionar aluno' });

      await user.click(within(picker).getByRole('button', { name: 'Cobrar sem selecionar aluno' }));

      // The picker is gone, the student field is back to its initial, unselected state, and the
      // payer combobox is the free-text search again. The dialog unmounts after its exit
      // transition, so this has to wait rather than check synchronously.
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: 'Selecionar aluno' })).not.toBeInTheDocument(),
      );
      expect(within(dialog).getByRole('button', { name: 'Selecionar aluno' })).toBeInTheDocument();
      await user.type(
        within(dialog).getByRole('combobox', { name: /Respons\u00e1vel que receber\u00e1 o boleto/ }),
        'Maria',
      );
      expect(await screen.findByRole('option', { name: /Maria Silva/ })).toBeInTheDocument();
    });
  });

  it('reports each outcome of a bulk issue on its own, ineligible contracts included', async () => {
    const BATCHES_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/charge_batches`;

    server.use(
      ...listingHandlers(),
      http.get(apiUrl(BATCHES_PATH), () =>
        HttpResponse.json({
          data: [
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
          ],
          meta: { billing_period: '2026-09' },
        }),
      ),
      http.post(apiUrl(BATCHES_PATH), () =>
        HttpResponse.json(
          {
            data: {
              created_charges: [],
              created_count: 1,
              skipped_contract_ids: [93, 94],
              ineligible_contract_ids: [95],
              contract_ids_without_payer: [96],
            },
          },
          { status: 201 },
        ),
      ),
    );

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Emitir em massa' }));

    const dialog = await screen.findByRole('dialog');

    await user.click(await within(dialog).findByRole('button', { name: 'Emitir 1 boleto(s)' }));

    expect(await screen.findByText(/1 boleto\(s\) gerado\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/2 já tinha\(m\) cobrança nesta competência/)).toBeInTheDocument();
    expect(screen.getByText(/1 contrato\(s\) não elegível\(is\) para cobrança/)).toBeInTheDocument();
    expect(screen.getByText(/1 sem responsável financeiro/)).toBeInTheDocument();
  });

  // One box over the payer's name and CPF: a secretary types what they have in front of them.
  it('searches the listing by name or CPF, and filters by status', async () => {
    const requests: URL[] = [];

    server.use(
      http.get(apiUrl(CHARGES_PATH), ({ request }) => {
        requests.push(new URL(request.url));

        return HttpResponse.json({
          data: [standaloneCharge],
          meta: { page: 1, per_page: 25, total: 1 },
        });
      }),
      ...listingHandlers([standaloneCharge]),
    );

    renderPage();
    await screen.findByText('Aluguel da quadra');

    await user.type(screen.getByRole('textbox', { name: 'Buscar boletos' }), '031.902');

    await waitFor(() => expect(requests[requests.length - 1]?.searchParams.get('q')).toBe('031.902'));

    await user.click(screen.getByRole('combobox', { name: 'Situa\u00e7\u00e3o' }));
    await user.click(await screen.findByRole('option', { name: 'Cancelado' }));

    await waitFor(() => expect(requests[requests.length - 1]?.searchParams.get('status')).toBe('cancelled'));
  });

  // A late boleto is an unpaid one; splitting the two would send the school looking twice.
  it('treats overdue as open', async () => {
    const requests: URL[] = [];

    server.use(
      http.get(apiUrl(CHARGES_PATH), ({ request }) => {
        requests.push(new URL(request.url));

        return HttpResponse.json({ data: [], meta: { page: 1, per_page: 25, total: 0 } });
      }),
      ...listingHandlers([standaloneCharge]),
    );

    renderPage();

    await user.click(await screen.findByRole('combobox', { name: 'Situa\u00e7\u00e3o' }));
    await user.click(await screen.findByRole('option', { name: 'Em aberto' }));

    await waitFor(() =>
      expect(requests[requests.length - 1]?.searchParams.get('status')).toBe('pending,overdue'),
    );
  });

  // A family billed by mistake is part of the record; a row that vanished would leave the
  // mistake unexplained.
  it('cancels a boleto and keeps it on the list', async () => {
    let cancelled = false;

    server.use(
      ...listingHandlers([standaloneCharge]),
      http.post(apiUrl(`${CHARGES_PATH}/${standaloneCharge.id}/cancel`), () => {
        cancelled = true;

        return HttpResponse.json({ data: { ...standaloneCharge, status: 'cancelled' } });
      }),
    );

    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Cancelar boleto de Maria Silva' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Cancelar boleto' }));

    await waitFor(() => expect(cancelled).toBe(true));
    expect(await screen.findByText(/permanece na lista/i)).toBeInTheDocument();
  });

  // Reading a boleto is checking it or handing it over, and both are quicker without losing the
  // listing behind them — so it opens in place rather than in a tab.
  it('opens the boleto without leaving the listing', async () => {
    const boletoUrl = 'https://bank.example/boleto.pdf';
    const issued = {
      ...standaloneCharge,
      boleto_url: boletoUrl,
      payment_methods: { ...NO_METHODS, boleto_url: boletoUrl },
    };

    server.use(
      ...listingHandlers([issued]),
      // The bank's own host, not the API — the file is fetched straight from it.
      http.get(boletoUrl, () =>
        HttpResponse.arrayBuffer(new TextEncoder().encode('%PDF-1.4').buffer, {
          headers: { 'Content-Type': 'application/pdf' },
        }),
      ),
    );
    // jsdom has no object URLs, and the frame is pointed at one.
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock/1');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Abrir boleto de Maria Silva' }));

    expect(await screen.findByTitle('Pré-visualização do boleto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeInTheDocument();
    // The listing is still behind the dialog, not navigated away from.
    expect(screen.getByText('Aluguel da quadra')).toBeInTheDocument();
  });

  // The bank is asked for the boleto in a background job, so the charge exists a moment before
  // its boleto does. Loading once leaves the column empty for good, which reads as the boleto
  // never having been generated — which is exactly what it looked like.
  it.each([
    ['a hosted boleto link (Cora)', { ...NO_METHODS, boleto_url: 'https://bank.example/boleto.pdf' }],
    ['a Pix code and no link (Inter)', { ...NO_METHODS, pix_copy_paste: PIX }],
    ['a linha digitavel and no link (Inter)', { ...NO_METHODS, digitable_line: LINE }],
    ['a relayed PDF and no link (Inter)', { ...NO_METHODS, boleto_pdf_available: true }],
  ])('waits for the boleto the bank is still generating until it has %s', async (_, arrived) => {
    const boletoUrl = arrived.boleto_url;
    let created = false;
    let listingsAfterCreate = 0;

    server.use(
      http.get(apiUrl(CHARGES_PATH), () => {
        // The job answers while the page is already listing: the first refetch after creating
        // still has no boleto, a later one does.
        if (created) {
          listingsAfterCreate += 1;
        }
        const issued = created && listingsAfterCreate > 1;

        return HttpResponse.json({
          data: [
            issued
              ? { ...standaloneCharge, boleto_url: boletoUrl, payment_methods: arrived }
              : standaloneCharge,
          ],
          meta: { page: 1, per_page: 25, total: 1 },
        });
      }),
      http.get(apiUrl(GUARDIANS_PATH), () =>
        HttpResponse.json({ data: [maria], meta: { page: 1, per_page: 25, total: 1 } }),
      ),
      http.get(apiUrl(CONTRACTS_PATH), () =>
        HttpResponse.json({ data: [], meta: { page: 1, per_page: 25, total: 0 } }),
      ),
      // Answers without a boleto, as the API does before the job has run.
      http.post(apiUrl(CHARGES_PATH), () => {
        created = true;

        return HttpResponse.json({ data: standaloneCharge }, { status: 201 });
      }),
    );

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Novo boleto avulso' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(
      within(dialog).getByRole('combobox', { name: /Responsável que receberá o boleto/ }),
      'Maria',
    );
    await user.click(await screen.findByRole('option', { name: /Maria Silva/ }));
    await user.click(await within(dialog).findByRole('combobox', { name: /Finalidade da cobran\u00e7a/ }));
    await user.click(await screen.findByRole('option', { name: 'Mensalidade' }));
    await user.type(dialog.querySelector('#charge-amount')!, '7500');
    await user.type(dialog.querySelector('#charge-due-date')!, '2026-09-15');
    await user.click(within(dialog).getByRole('button', { name: 'Gerar boleto' }));

    // The boleto arrives on a later refetch, with nobody reloading the page.
    expect(
      await screen.findByRole('button', { name: 'Abrir boleto de Maria Silva' }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(listingsAfterCreate).toBeGreaterThan(1);
  });

  // Banco Inter has no hosted URL: the popup shows the PDF the API relays, with the codes beneath.
  describe('a Banco Inter boleto, which has no hosted URL', () => {
    const pdfPath = `${CHARGES_PATH}/${interCharge.id}/boleto_pdf`;

    const stubObjectUrls = () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock/1');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    };

    it('opens the popup with the PDF from the staff endpoint, the Pix code and the linha digitavel', async () => {
      let authorization: string | null = null;
      let pdfRequests = 0;

      server.use(
        ...listingHandlers([interCharge]),
        http.get(apiUrl(pdfPath), ({ request }) => {
          pdfRequests += 1;
          authorization = request.headers.get('Authorization');

          return new HttpResponse('%PDF-1.4', { headers: { 'Content-Type': 'application/pdf' } });
        }),
      );
      stubObjectUrls();

      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Abrir boleto de Maria Silva' }));

      expect(await screen.findByTitle('Pré-visualização do boleto')).toBeInTheDocument();
      expect(pdfRequests).toBe(1);
      expect(authorization).toBe(`Bearer ${FRESH_ACCESS_TOKEN}`);

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(PIX)).toBeInTheDocument();
      expect(within(dialog).getByText(LINE)).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Baixar PDF' })).toBeInTheDocument();
    });

    it('copies the Pix code and the linha digitavel from the popup', async () => {
      server.use(
        ...listingHandlers([interCharge]),
        http.get(apiUrl(pdfPath), () => new HttpResponse('%PDF-1.4')),
      );
      stubObjectUrls();
      const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Abrir boleto de Maria Silva' }));
      await user.click(await screen.findByRole('button', { name: 'Copiar código Pix' }));
      expect(writeText).toHaveBeenLastCalledWith(PIX);
      expect(await screen.findByRole('button', { name: 'Código Pix copiado' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Copiar linha digitável' }));
      expect(writeText).toHaveBeenLastCalledWith(LINE);
    });

    it('reports the API reason when the relayed PDF is unavailable, keeping the codes', async () => {
      server.use(
        ...listingHandlers([interCharge]),
        http.get(apiUrl(pdfPath), () =>
          HttpResponse.json(
            { error: { code: 'boleto_pdf_unavailable', message: 'Indisponível', details: {} } },
            { status: 409 },
          ),
        ),
      );

      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Abrir boleto de Maria Silva' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Este boleto não está disponível para visualização agora.',
      );
      expect(screen.getByText(PIX)).toBeInTheDocument();
    });

    it('opens on the codes alone while the bank has not produced the PDF yet', async () => {
      const pdfRequests: string[] = [];
      server.use(
        ...listingHandlers([
          {
            ...interCharge,
            payment_methods: { ...interCharge.payment_methods, boleto_pdf_available: false },
          },
        ]),
        http.get(apiUrl(pdfPath), ({ request }) => {
          pdfRequests.push(request.url);

          return new HttpResponse('%PDF-1.4');
        }),
      );

      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Abrir boleto de Maria Silva' }));

      expect(await screen.findByText(PIX)).toBeInTheDocument();
      expect(screen.queryByTitle('Pré-visualização do boleto')).not.toBeInTheDocument();
      expect(pdfRequests).toEqual([]);
    });
  });

  // A hosted (Cora) boleto still goes to the bank's own URL, never through the relayed endpoint.
  it('previews a hosted boleto straight from the bank, not through the API relay', async () => {
    const boletoUrl = 'https://bank.example/boleto.pdf';
    let relayRequests = 0;

    server.use(
      ...listingHandlers([
        {
          ...standaloneCharge,
          boleto_url: boletoUrl,
          payment_methods: { ...NO_METHODS, boleto_url: boletoUrl, boleto_pdf_available: true },
        },
      ]),
      http.get(boletoUrl, () =>
        HttpResponse.arrayBuffer(new TextEncoder().encode('%PDF-1.4').buffer, {
          headers: { 'Content-Type': 'application/pdf' },
        }),
      ),
      http.get(apiUrl(`${CHARGES_PATH}/${standaloneCharge.id}/boleto_pdf`), () => {
        relayRequests += 1;

        return new HttpResponse('%PDF-1.4');
      }),
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock/1');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Abrir boleto de Maria Silva' }));

    expect(await screen.findByTitle('Pré-visualização do boleto')).toBeInTheDocument();
    expect(relayRequests).toBe(0);
  });

  it('offers no way to open a cancelled boleto, even one that still carries its codes', async () => {
    server.use(...listingHandlers([{ ...interCharge, status: 'cancelled' }]));

    renderPage();
    await screen.findByText('Aluguel da quadra');

    expect(screen.queryByRole('button', { name: /Abrir boleto de/ })).not.toBeInTheDocument();
  });

  it('offers a Pix-only charge, whose PDF the bank has not produced, for opening', async () => {
    server.use(
      ...listingHandlers([
        { ...standaloneCharge, payment_methods: { ...NO_METHODS, pix_copy_paste: PIX } },
      ]),
    );

    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Abrir boleto de Maria Silva' }),
    ).toBeInTheDocument();
  });

  it('offers nothing to open on a charge with no boleto yet', async () => {
    server.use(...listingHandlers([standaloneCharge]));

    renderPage();
    await screen.findByText('Aluguel da quadra');

    expect(screen.queryByRole('button', { name: /Abrir boleto de/ })).not.toBeInTheDocument();
  });

  // Nothing to withdraw on a boleto that was already paid.
  it('offers no cancel action on a paid boleto', async () => {
    server.use(...listingHandlers([{ ...standaloneCharge, status: 'paid' }]));

    renderPage();
    await screen.findByText('Aluguel da quadra');

    expect(
      screen.queryByRole('button', { name: /Cancelar boleto de/ }),
    ).not.toBeInTheDocument();
  });
});
