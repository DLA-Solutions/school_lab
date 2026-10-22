import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  DIRECTOR_TEMPLATE_ID,
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  http,
  jsonError,
  sampleMinutesBook,
  sampleMinutesEntryDetail,
  sampleMinutesEntrySummary,
  server,
  staffMembership,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import { Membership } from 'types/auth';
import SchoolMinutes from './SchoolMinutes';

const BASE = `/api/v1/schools/${SCHOOL_ID}`;

const user = userEvent.setup({ delay: null });

const directorMembership: Membership = {
  ...staffMembership,
  id: 21,
  role_template: {
    id: DIRECTOR_TEMPLATE_ID,
    name: 'Direção',
    system_key: 'director',
    is_system: true,
  },
  display_title: 'Diretor',
};

const teacherMembership: Membership = { ...staffMembership, role: 'teacher', role_template: null };

const renderPage = (membership: Membership = directorMembership) => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(
    <MemoryRouter initialEntries={['/atas-da-escola']}>
      <SchoolMinutes />
    </MemoryRouter>,
    { memberships: [membership] },
  );
};

const page = <T,>(rows: T[]) => ({
  data: rows,
  meta: { page: 1, per_page: 25, total: rows.length },
});

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:minutes-pdf');
  URL.revokeObjectURL = vi.fn();
});

describe('SchoolMinutes page — access and header', () => {
  it('lists the atas under the "Atas da Escola" heading with a link to the incident notes', async () => {
    renderPage();

    expect(await screen.findByText('Reunião de pais')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Atas da Escola' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'Livro Ata 2026 (2026)' })).toBeInTheDocument();
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Notas de ocorrência' })).toHaveAttribute(
      'href',
      '/academico/atas',
    );
    expect(screen.getByRole('button', { name: 'Nova ata' })).toBeInTheDocument();
  });

  it('shows no-access instead of calling the API for a teacher', async () => {
    let called = false;
    server.use(
      http.get(apiUrl(`${BASE}/minutes_entries`), () => {
        called = true;
        return HttpResponse.json(page([]));
      }),
    );

    renderPage(teacherMembership);

    expect(
      await screen.findByText('Você não tem acesso às atas desta escola.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nova ata' })).not.toBeInTheDocument();
    expect(called).toBe(false);
  });

  it('explains an empty list, and offers to create the first ata', async () => {
    server.use(http.get(apiUrl(`${BASE}/minutes_entries`), () => HttpResponse.json(page([]))));

    renderPage();

    expect(await screen.findByText('Nenhuma ata encontrada')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Nova ata' })).toHaveLength(2);
  });

  it('surfaces a load failure with a retry', async () => {
    server.use(
      http.get(apiUrl(`${BASE}/minutes_entries`), () =>
        jsonError(403, 'forbidden', 'Acesso negado.'),
      ),
    );

    renderPage();

    expect(await screen.findByText('Acesso negado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});

describe('SchoolMinutes page — search and filters', () => {
  it('searches by participant name and by year', async () => {
    const queries: URLSearchParams[] = [];
    server.use(
      http.get(apiUrl(`${BASE}/minutes_entries`), ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json(page([sampleMinutesEntrySummary]));
      }),
    );

    renderPage();
    await screen.findByText('Reunião de pais');

    await user.type(screen.getByRole('textbox', { name: 'Buscar por participante' }), 'Ana');
    await waitFor(() => expect(queries.some((query) => query.get('q') === 'Ana')).toBe(true));

    await user.type(screen.getByRole('textbox', { name: 'Ano do livro' }), '2026');
    await waitFor(() =>
      expect(
        queries.some((query) => query.get('q') === 'Ana' && query.get('year') === '2026'),
      ).toBe(true),
    );
  });

  it('filters by status, kind and book', async () => {
    const queries: URLSearchParams[] = [];
    server.use(
      http.get(apiUrl(`${BASE}/minutes_entries`), ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json(page([sampleMinutesEntrySummary]));
      }),
    );

    renderPage();
    await screen.findByText('Reunião de pais');

    await user.click(screen.getByRole('combobox', { name: 'Situação' }));
    await user.click(await screen.findByRole('option', { name: 'Assinada' }));
    await waitFor(() =>
      expect(queries.some((query) => query.get('status') === 'signed')).toBe(true),
    );

    await user.click(screen.getByRole('combobox', { name: 'Tipo' }));
    await user.click(await screen.findByRole('option', { name: 'Ata de Conselho de Classe' }));
    await waitFor(() =>
      expect(queries.some((query) => query.get('kind') === 'class_council')).toBe(true),
    );

    await user.click(screen.getByRole('combobox', { name: 'Livro' }));
    await user.click(await screen.findByRole('option', { name: 'Livro Ata 2026 (2026)' }));
    await waitFor(() =>
      expect(queries.some((query) => query.get('minutes_book_id') === '1')).toBe(true),
    );
  });
});

describe('SchoolMinutes page — books', () => {
  it('lists the books with their entry counts', async () => {
    renderPage();

    expect(await screen.findByText('1 atas')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Livros ata' })).toBeInTheDocument();
  });

  it('creates a book and shows a duplicate name + year inline', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(apiUrl(`${BASE}/minutes_books`), async ({ request }) => {
        bodies.push(await request.json());
        if (bodies.length === 1) {
          return jsonError(422, 'validation_error', 'Dados inválidos.', {
            name: ['já existe um livro com este nome e ano'],
          });
        }
        return HttpResponse.json(
          { data: { ...sampleMinutesBook, id: 2, name: 'Livro Ata 2027', year: 2027 } },
          { status: 201 },
        );
      }),
    );

    renderPage();
    await screen.findByText('Reunião de pais');

    await user.click(screen.getByRole('button', { name: 'Novo livro ata' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo livro ata' });

    // Client-side: a blank name never leaves the browser.
    await user.clear(within(dialog).getByLabelText(/^Ano/));
    await user.type(within(dialog).getByLabelText(/^Ano/), '2026');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialog).findByText('Informe o nome do livro.')).toBeInTheDocument();
    expect(bodies).toHaveLength(0);

    await user.type(within(dialog).getByLabelText(/^Nome/), 'Livro Ata 2026');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(
      await within(dialog).findByText('já existe um livro com este nome e ano'),
    ).toBeInTheDocument();
    expect(bodies[0]).toEqual({ minutes_book: { name: 'Livro Ata 2026', year: 2026 } });

    await user.clear(within(dialog).getByLabelText(/^Nome/));
    await user.type(within(dialog).getByLabelText(/^Nome/), 'Livro Ata 2027');
    await user.clear(within(dialog).getByLabelText(/^Ano/));
    await user.type(within(dialog).getByLabelText(/^Ano/), '2027');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Novo livro ata' })).not.toBeInTheDocument(),
    );
    expect(bodies[1]).toEqual({ minutes_book: { name: 'Livro Ata 2027', year: 2027 } });
  });
});

describe('SchoolMinutes page — "Nova ata" chooser and form', () => {
  const openChooser = async () => {
    renderPage();
    await screen.findByText('Reunião de pais');
    await user.click(screen.getByRole('button', { name: 'Nova ata' }));
    return screen.findByRole('dialog', { name: 'Nova ata' });
  };

  it('offers the three kinds of ata', async () => {
    const chooser = await openChooser();

    expect(within(chooser).getByRole('button', { name: 'Ata de reunião' })).toBeInTheDocument();
    expect(
      within(chooser).getByRole('button', { name: 'Ata de Conselho de Classe' }),
    ).toBeInTheDocument();
    expect(
      within(chooser).getByRole('button', { name: 'Ata de resultados finais' }),
    ).toBeInTheDocument();
  });

  it('asks for a class only on the Conselho de Classe form', async () => {
    const chooser = await openChooser();
    await user.click(within(chooser).getByRole('button', { name: 'Ata de reunião' }));

    const meetingForm = await screen.findByRole('dialog', { name: /Nova ata/ });
    expect(within(meetingForm).queryByLabelText('Turma')).not.toBeInTheDocument();
    await user.click(within(meetingForm).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Nova ata' }));
    await user.click(await screen.findByRole('button', { name: 'Ata de Conselho de Classe' }));
    const councilForm = await screen.findByRole('dialog', { name: /Nova ata/ });
    expect(within(councilForm).getByLabelText('Turma')).toBeInTheDocument();
  });

  it('validates required fields and signers before calling the API', async () => {
    let posted = false;
    server.use(
      http.post(apiUrl(`${BASE}/minutes_entries`), () => {
        posted = true;
        return jsonError(500, 'unexpected_error', 'não deveria chamar');
      }),
    );

    const chooser = await openChooser();
    await user.click(within(chooser).getByRole('button', { name: 'Ata de reunião' }));
    const form = await screen.findByRole('dialog', { name: /Nova ata/ });

    await user.click(within(form).getByRole('button', { name: 'Adicionar participante' }));
    const participant = within(form).getByRole('group', { name: 'Participantes 1' });
    await user.type(within(participant).getByLabelText(/^Nome/), 'Ana Souza');
    await user.click(within(participant).getByRole('checkbox', { name: 'Assina' }));

    await user.click(within(form).getByRole('button', { name: 'Salvar rascunho' }));

    expect(await within(form).findByText('Informe o título.')).toBeInTheDocument();
    expect(within(form).getByText('Quem assina precisa de e-mail.')).toBeInTheDocument();
    expect(within(form).getByText('Quem assina precisa de um CPF válido.')).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it('creates a draft with the typed body and the participants, CPF as bare digits', async () => {
    const bodies: { minutes_entry: Record<string, unknown> }[] = [];
    server.use(
      http.post(apiUrl(`${BASE}/minutes_entries`), async ({ request }) => {
        bodies.push((await request.json()) as { minutes_entry: Record<string, unknown> });
        return HttpResponse.json({ data: sampleMinutesEntryDetail }, { status: 201 });
      }),
    );

    const chooser = await openChooser();
    await user.click(within(chooser).getByRole('button', { name: 'Ata de resultados finais' }));
    const form = await screen.findByRole('dialog', { name: /Nova ata/ });

    await user.type(within(form).getByLabelText(/^Título/), 'Resultados 2026');
    await user.click(within(form).getByRole('textbox', { name: 'Texto da ata' }));
    await user.keyboard('Aprovados em conselho');

    await user.click(within(form).getByRole('button', { name: 'Adicionar participante' }));
    const participant = within(form).getByRole('group', { name: 'Participantes 1' });
    await user.type(within(participant).getByLabelText(/^Nome/), 'Ana Souza');
    await user.type(within(participant).getByLabelText(/^E-mail/), 'ana@example.com');
    await user.type(within(participant).getByLabelText(/^CPF/), '52998224725');
    await user.click(within(participant).getByRole('checkbox', { name: 'Assina' }));

    await user.click(within(form).getByRole('button', { name: 'Salvar rascunho' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].minutes_entry).toMatchObject({
      minutes_book_id: 1,
      kind: 'final_results',
      title: 'Resultados 2026',
      body: '<p>Aprovados em conselho</p>',
      school_class_id: null,
      participants: [
        {
          name: 'Ana Souza',
          email: 'ana@example.com',
          cpf: '52998224725',
          signs: true,
        },
      ],
    });
  });

  it('shows the API validation errors next to the participant they name', async () => {
    server.use(
      http.post(apiUrl(`${BASE}/minutes_entries`), () =>
        jsonError(422, 'validation_error', 'Dados inválidos.', {
          'participants.0.cpf': ['não é um CPF válido'],
          title: ['já usado neste livro'],
        }),
      ),
    );

    const chooser = await openChooser();
    await user.click(within(chooser).getByRole('button', { name: 'Ata de reunião' }));
    const form = await screen.findByRole('dialog', { name: /Nova ata/ });

    await user.type(within(form).getByLabelText(/^Título/), 'Reunião');
    await user.click(within(form).getByRole('button', { name: 'Adicionar participante' }));
    const participant = within(form).getByRole('group', { name: 'Participantes 1' });
    await user.type(within(participant).getByLabelText(/^Nome/), 'Ana Souza');
    await user.click(within(form).getByRole('button', { name: 'Salvar rascunho' }));

    expect(await within(form).findByText('não é um CPF válido')).toBeInTheDocument();
    expect(within(form).getByText('já usado neste livro')).toBeInTheDocument();
  });

  it('shows details.base from the API in the banner', async () => {
    server.use(
      http.post(apiUrl(`${BASE}/minutes_entries`), () =>
        jsonError(422, 'validation_error', 'Dados inválidos.', {
          base: ['Livro encerrado.'],
        }),
      ),
    );

    const chooser = await openChooser();
    await user.click(within(chooser).getByRole('button', { name: 'Ata de reunião' }));
    const form = await screen.findByRole('dialog', { name: /Nova ata/ });

    await user.type(within(form).getByLabelText(/^Título/), 'Reunião');
    await user.click(within(form).getByRole('button', { name: 'Salvar rascunho' }));

    expect(await within(form).findByText('Livro encerrado.')).toBeInTheDocument();
  });
});

describe('SchoolMinutes page — entry detail and actions', () => {
  const openEntry = async () => {
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Abrir ata Reunião de pais' }));
    return screen.findByRole('dialog', { name: /Reunião de pais/ });
  };

  it('shows the body, the participants and the draft actions', async () => {
    const detail = await openEntry();

    expect(await within(detail).findByText('Combinados do semestre.')).toBeInTheDocument();
    expect(within(detail).getByText('Ana Souza — Diretora')).toBeInTheDocument();
    expect(within(detail).getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(
      within(detail).getByRole('button', { name: 'Enviar para assinatura' }),
    ).toBeInTheDocument();
    expect(within(detail).getByRole('button', { name: 'Cancelar ata' })).toBeInTheDocument();
  });

  it('previews the PDF in a dialog', async () => {
    const detail = await openEntry();
    await user.click(await within(detail).findByRole('button', { name: 'Pré-visualizar PDF' }));

    expect(await screen.findByTitle('Ata')).toHaveAttribute('src', 'blob:minutes-pdf');
  });

  it('sends for signature after a confirmation and shows the new status', async () => {
    let sent = 0;
    server.use(
      http.post(apiUrl(`${BASE}/minutes_entries/9/send_for_signature`), () => {
        sent += 1;
        return HttpResponse.json({
          data: {
            ...sampleMinutesEntryDetail,
            status: 'pending_signature',
            sent_to_provider: true,
            signature_requested_at: '2026-03-11T10:00:00Z',
          },
        });
      }),
    );

    const detail = await openEntry();
    await user.click(await within(detail).findByRole('button', { name: 'Enviar para assinatura' }));

    const confirm = await screen.findByRole('dialog', { name: 'Enviar para assinatura?' });
    expect(within(confirm).getByText(/1 assinante\(s\)/)).toBeInTheDocument();
    expect(sent).toBe(0);
    await user.click(within(confirm).getByRole('button', { name: 'Enviar' }));

    expect(await within(detail).findByText('Ata enviada para assinatura.')).toBeInTheDocument();
    expect(sent).toBe(1);
    expect(within(detail).getByText('Aguardando assinaturas')).toBeInTheDocument();
    // No longer a draft: edit and send are gone, cancel remains.
    expect(within(detail).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(
      within(detail).queryByRole('button', { name: 'Enviar para assinatura' }),
    ).not.toBeInTheDocument();
    expect(await within(detail).findByRole('button', { name: 'Cancelar ata' })).toBeInTheDocument();
  });

  it('names the signer problem when the API refuses the send with a 422', async () => {
    server.use(
      http.post(apiUrl(`${BASE}/minutes_entries/9/send_for_signature`), () =>
        jsonError(422, 'validation_error', 'Dados inválidos.', {
          base: ['Assinante sem e-mail ou CPF: Ana Souza'],
        }),
      ),
    );

    const detail = await openEntry();
    await user.click(await within(detail).findByRole('button', { name: 'Enviar para assinatura' }));
    const confirm = await screen.findByRole('dialog', { name: 'Enviar para assinatura?' });
    await user.click(within(confirm).getByRole('button', { name: 'Enviar' }));

    expect(
      await within(detail).findByText('Assinante sem e-mail ou CPF: Ana Souza'),
    ).toBeInTheDocument();
    // Still a draft.
    expect(await within(detail).findByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('explains an Autentique outage (502) and a state conflict (409) in plain words', async () => {
    server.use(
      http.post(apiUrl(`${BASE}/minutes_entries/9/send_for_signature`), () =>
        jsonError(502, 'provider_error', 'upstream'),
      ),
    );

    const detail = await openEntry();
    await user.click(await within(detail).findByRole('button', { name: 'Enviar para assinatura' }));
    let confirm = await screen.findByRole('dialog', { name: 'Enviar para assinatura?' });
    await user.click(within(confirm).getByRole('button', { name: 'Enviar' }));

    expect(
      await within(detail).findByText(
        'Não foi possível falar com o Autentique agora. Tente novamente em instantes.',
      ),
    ).toBeInTheDocument();

    server.use(
      http.post(apiUrl(`${BASE}/minutes_entries/9/send_for_signature`), () =>
        jsonError(409, 'invalid_state_transition', 'conflict'),
      ),
    );

    await user.click(await within(detail).findByRole('button', { name: 'Enviar para assinatura' }));
    confirm = await screen.findByRole('dialog', { name: 'Enviar para assinatura?' });
    await user.click(within(confirm).getByRole('button', { name: 'Enviar' }));

    expect(
      await within(detail).findByText(/não está mais em um estado que permita essa ação/),
    ).toBeInTheDocument();
  });

  it('cancels after a confirmation', async () => {
    let cancelled = 0;
    server.use(
      http.post(apiUrl(`${BASE}/minutes_entries/9/cancel`), () => {
        cancelled += 1;
        return HttpResponse.json({
          data: {
            ...sampleMinutesEntryDetail,
            status: 'cancelled',
            cancelled_at: '2026-03-12T10:00:00Z',
          },
        });
      }),
    );

    const detail = await openEntry();
    await user.click(await within(detail).findByRole('button', { name: 'Cancelar ata' }));

    const confirm = await screen.findByRole('dialog', { name: 'Cancelar esta ata?' });
    expect(cancelled).toBe(0);
    await user.click(within(confirm).getByRole('button', { name: 'Cancelar ata' }));

    expect(await within(detail).findByText('Ata cancelada.')).toBeInTheDocument();
    expect(cancelled).toBe(1);
    expect(within(detail).getByText('Cancelada')).toBeInTheDocument();
    expect(within(detail).queryByRole('button', { name: 'Cancelar ata' })).not.toBeInTheDocument();
  });

  it('offers no edit or send on a signed ata, only its signed copy', async () => {
    server.use(
      http.get(apiUrl(`${BASE}/minutes_entries/9`), () =>
        HttpResponse.json({
          data: { ...sampleMinutesEntryDetail, status: 'signed', has_signed_pdf: true },
        }),
      ),
    );

    const detail = await openEntry();

    expect(
      await within(detail).findByRole('button', { name: 'Ver PDF assinado' }),
    ).toBeInTheDocument();
    expect(within(detail).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(
      within(detail).queryByRole('button', { name: 'Enviar para assinatura' }),
    ).not.toBeInTheDocument();
    expect(within(detail).queryByRole('button', { name: 'Cancelar ata' })).not.toBeInTheDocument();
  });

  it('edits a draft without resending the participants it never touched', async () => {
    const bodies: { minutes_entry: Record<string, unknown> }[] = [];
    server.use(
      http.patch(apiUrl(`${BASE}/minutes_entries/9`), async ({ request }) => {
        bodies.push((await request.json()) as { minutes_entry: Record<string, unknown> });
        return HttpResponse.json({
          data: { ...sampleMinutesEntryDetail, title: 'Reunião de pais 2º semestre' },
        });
      }),
    );

    const detail = await openEntry();
    await user.click(await within(detail).findByRole('button', { name: 'Editar' }));

    const form = await screen.findByRole('dialog', { name: /Editar ata/ });
    const title = within(form).getByLabelText(/^Título/);
    expect(title).toHaveValue('Reunião de pais');
    expect(within(form).getByText(/CPF cadastrado: \*\*\*\.982\.247-\*\*/)).toBeInTheDocument();

    await user.clear(title);
    await user.type(title, 'Reunião de pais 2º semestre');
    await user.click(within(form).getByRole('button', { name: 'Salvar rascunho' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].minutes_entry.title).toBe('Reunião de pais 2º semestre');
    expect(bodies[0].minutes_entry).not.toHaveProperty('participants');
    expect(bodies[0].minutes_entry).not.toHaveProperty('kind');
  });
});
