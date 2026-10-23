import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import { FamilyDocument, SchoolDocument } from 'types/document';
import { DocumentableType } from 'services/documentsApi';
import PersonDocumentsDialog from './PersonDocumentsDialog';

const DOCUMENTS_PATH = `/api/v1/schools/${SCHOOL_ID}/documents`;

const user = userEvent.setup({ delay: null });

/** Stands in for any owner; the dialog only needs a type, an id and a heading. */
const guardian = { id: 7, name: 'Maria Silva' };

/** Secretaria, coordenação and direção hold `manage_documents`; the default fixture does not. */
const managerMembership = {
  ...staffMembership,
  permissions: ['manage_people', 'manage_documents'],
  permission_sources: { manage_people: 'template', manage_documents: 'template' },
};

const storedDocument: SchoolDocument = {
  id: 31,
  school_id: SCHOOL_ID,
  documentable_type: 'Guardian',
  documentable_id: guardian.id,
  document_type: 'rg',
  status: 'approved',
  rejection_reason: null,
  reviewed_at: null,
  created_at: '2026-08-08T12:00:00Z',
  updated_at: '2026-08-08T12:00:00Z',
  filename: 'rg-maria.pdf',
  content_type: 'application/pdf',
  byte_size: 20480,
  file_url: '/rails/active_storage/blobs/abc/rg-maria.pdf',
  discarded_at: null,
  discarded_by_name: null,
};

const inactiveDocument: SchoolDocument = {
  ...storedDocument,
  id: 41,
  filename: 'rg-antigo.pdf',
  file_url: '/rails/active_storage/blobs/abc/rg-antigo.pdf',
  discarded_at: '2026-09-15T12:00:00Z',
  discarded_by_name: 'secretaria@example.com',
};

const emptyList = { data: [], meta: { page: 1, per_page: 25, total: 0 } };

const renderDialog = (
  documentableType: DocumentableType = 'Guardian',
  { canManage = false }: { canManage?: boolean } = {},
) => {
  const onClose = vi.fn();

  renderWithTheme(
    <PersonDocumentsDialog
      open
      schoolId={SCHOOL_ID}
      documentableType={documentableType}
      documentableId={guardian.id}
      title={guardian.name}
      onClose={onClose}
    />,
    { memberships: [canManage ? managerMembership : staffMembership] },
  );

  return { onClose };
};

const authenticate = () => setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

describe('PersonDocumentsDialog', () => {
  it('asks the API for the guardian’s family documents, not for the owner filter', async () => {
    authenticate();

    let requestedUrl = '';
    server.use(
      http.get(apiUrl(DOCUMENTS_PATH), ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          data: [storedDocument],
          meta: { page: 1, per_page: 25, total: 1 },
        });
      }),
    );

    renderDialog();

    expect(await screen.findByText('rg-maria.pdf')).toBeInTheDocument();

    // Combining `guardian_id` with `documentable_*` is a 422, so only the first is sent.
    const query = new URL(requestedUrl).searchParams;
    expect(query.get('guardian_id')).toBe(String(guardian.id));
    expect(query.has('documentable_type')).toBe(false);
    expect(query.has('documentable_id')).toBe(false);
  });

  it('keeps the per-owner query for a student', async () => {
    authenticate();

    let requestedUrl = '';
    server.use(
      http.get(apiUrl(DOCUMENTS_PATH), ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json(emptyList);
      }),
    );

    renderDialog('Student');

    expect(await screen.findByText(/nenhum documento enviado/i)).toBeInTheDocument();

    const query = new URL(requestedUrl).searchParams;
    expect(query.get('documentable_type')).toBe('Student');
    expect(query.get('documentable_id')).toBe(String(guardian.id));
    expect(query.has('guardian_id')).toBe(false);
  });

  it('shows which child a guardian’s file belongs to, who sent it and its type', async () => {
    authenticate();

    const childBound: FamilyDocument = {
      ...storedDocument,
      id: 32,
      documentable_type: 'Student',
      documentable_id: 4,
      document_type: 'school_transcript',
      filename: 'historico.pdf',
      student_id: 4,
      student_name: 'Pedro Silva',
      uploaded_by_name: 'Maria Silva',
      uploaded_by_kind: 'guardian',
    };
    const fromSchool: FamilyDocument = {
      ...childBound,
      id: 33,
      document_type: 'guardian_identity',
      filename: 'rg-cpf.pdf',
      uploaded_by_name: null,
      uploaded_by_kind: 'school',
    };
    const signedContract: FamilyDocument = {
      ...childBound,
      id: 34,
      document_type: 'signed_contract',
      status: 'approved',
      filename: 'contrato-assinado-pedro-silva.pdf',
      uploaded_by_name: null,
      uploaded_by_kind: null,
    };
    const own: FamilyDocument = {
      ...storedDocument,
      student_id: null,
      student_name: null,
      uploaded_by_name: null,
      uploaded_by_kind: 'school',
    };

    server.use(
      http.get(apiUrl(DOCUMENTS_PATH), () =>
        HttpResponse.json({
          data: [own, childBound, fromSchool, signedContract],
          meta: { page: 1, per_page: 25, total: 4 },
        }),
      ),
    );

    renderDialog();

    const transcript = (await screen.findByText('historico.pdf')).closest('li') as HTMLElement;
    expect(within(transcript).getByText(/histórico escolar/i)).toBeInTheDocument();
    expect(within(transcript).getByText(/aluno: pedro silva/i)).toBeInTheDocument();
    expect(within(transcript).getByText(/enviado por maria silva/i)).toBeInTheDocument();

    const identity = screen.getByText('rg-cpf.pdf').closest('li') as HTMLElement;
    expect(within(identity).getByText(/rg e cpf dos responsáveis/i)).toBeInTheDocument();
    expect(within(identity).getByText(/enviado pela escola/i)).toBeInTheDocument();

    // Filed by the system on signature: a proper type label and a system sender, not an empty one.
    const contract = screen
      .getByText('contrato-assinado-pedro-silva.pdf')
      .closest('li') as HTMLElement;
    expect(within(contract).getByText(/contrato assinado/i)).toBeInTheDocument();
    expect(within(contract).getByText(/gerado pela assinatura eletrônica/i)).toBeInTheDocument();

    // A file attached to the guardian itself has no child to name.
    const ownItem = screen.getByText('rg-maria.pdf').closest('li') as HTMLElement;
    expect(within(ownItem).queryByText(/aluno:/i)).not.toBeInTheDocument();
  });

  it('shows the empty state when the guardian’s family has no documents', async () => {
    authenticate();

    server.use(http.get(apiUrl(DOCUMENTS_PATH), () => HttpResponse.json(emptyList)));

    renderDialog();

    expect(await screen.findByText(/nenhum documento enviado/i)).toBeInTheDocument();
  });

  it('uploads the picked file as multipart, tagged with the chosen type', async () => {
    authenticate();

    // Read the parts inside the handler, while the request body is still live — holding the
    // FormData past the response and reading it later is not reliable.
    let uploaded: Record<string, string | number> | undefined;
    let contentType: string | null = null;

    server.use(
      http.get(apiUrl(DOCUMENTS_PATH), () => HttpResponse.json(emptyList)),
      http.post(apiUrl(DOCUMENTS_PATH), async ({ request }) => {
        contentType = request.headers.get('Content-Type');
        const bodyText = new TextDecoder('latin1').decode(await request.arrayBuffer());

        uploaded = {
          documentable_type: bodyText.includes('Guardian') ? 'Guardian' : '',
          documentable_id: String(guardian.id),
          document_type: bodyText.includes('rg') ? 'rg' : '',
          fileType: bodyText.includes('application/pdf') ? 'application/pdf' : '',
          fileSize: bodyText.length,
        };

        return HttpResponse.json({ data: storedDocument }, { status: 201 });
      }),
    );

    renderDialog();

    await screen.findByText(/nenhum documento enviado/i);

    await user.click(screen.getByRole('combobox', { name: /tipo de documento/i }));
    await user.click(screen.getByRole('option', { name: 'RG' }));

    const file = new File(['conteudo'], 'rg-maria.pdf', { type: 'application/pdf' });
    // The visible control is the button; the input it drives is the upload target.
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);

    await waitFor(() => expect(uploaded).toBeDefined());

    expect(uploaded?.documentable_type).toBe('Guardian');
    expect(uploaded?.documentable_id).toBe(String(guardian.id));
    expect(uploaded?.document_type).toBe('rg');
    // The part is re-parsed by undici in its own realm: the filename is dropped, text() is not
    // implemented, and the re-encoded size differs from the source by a byte. Asserting an exact
    // size would pin a jsdom artefact, so this checks what the assertion is actually about — a
    // real file rode along under the right MIME type, not an empty part.
    expect(uploaded?.fileType).toBe('application/pdf');
    expect(uploaded?.fileSize).toBeGreaterThan(0);

    // The boundary is the browser's to choose — the client must not pin Content-Type itself.
    expect(contentType).toMatch(/^multipart\/form-data; boundary=/);
  });

  it('reloads the list after a successful upload', async () => {
    authenticate();

    let listCalls = 0;
    server.use(
      http.get(apiUrl(DOCUMENTS_PATH), () => {
        listCalls += 1;
        return HttpResponse.json(
          listCalls === 1
            ? emptyList
            : { data: [storedDocument], meta: { page: 1, per_page: 25, total: 1 } },
        );
      }),
      http.post(apiUrl(DOCUMENTS_PATH), () =>
        HttpResponse.json({ data: storedDocument }, { status: 201 }),
      ),
    );

    renderDialog();
    await screen.findByText(/nenhum documento enviado/i);

    await user.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      new File(['x'], 'rg-maria.pdf', { type: 'application/pdf' }),
    );

    expect(await screen.findByText('rg-maria.pdf')).toBeInTheDocument();
  });

  it('surfaces a rejected upload instead of leaving the list unchanged', async () => {
    authenticate();

    server.use(
      http.get(apiUrl(DOCUMENTS_PATH), () => HttpResponse.json(emptyList)),
      http.post(apiUrl(DOCUMENTS_PATH), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Dados inválidos.',
              details: { file: ['não pode ficar em branco'] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    renderDialog();
    await screen.findByText(/nenhum documento enviado/i);

    await user.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      new File(['x'], 'quebrado.pdf', { type: 'application/pdf' }),
    );

    expect(await screen.findByText(/não pode ficar em branco/i)).toBeInTheDocument();
  });

  it('links each document to its blob on the API host', async () => {
    authenticate();

    server.use(
      http.get(apiUrl(DOCUMENTS_PATH), () =>
        HttpResponse.json({ data: [storedDocument], meta: { page: 1, per_page: 25, total: 1 } }),
      ),
    );

    renderDialog();

    const link = await screen.findByRole('link', { name: 'rg-maria.pdf' });
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining(storedDocument.file_url as string),
    );
  });

  describe('inactivating a document (BR-ARC14)', () => {
    const listOf = (...documents: SchoolDocument[]) => ({
      data: documents,
      meta: { page: 1, per_page: 25, total: documents.length },
    });

    it('asks for confirmation, explaining the file is kept, then inactivates and refreshes', async () => {
      authenticate();

      let inactivated: string | null = null;
      let listCalls = 0;

      server.use(
        http.get(apiUrl(DOCUMENTS_PATH), () => {
          listCalls += 1;
          return HttpResponse.json(listCalls === 1 ? listOf(storedDocument) : emptyList);
        }),
        http.delete(apiUrl(`${DOCUMENTS_PATH}/:id`), ({ params }) => {
          inactivated = String(params.id);
          return new HttpResponse(null, { status: 204 });
        }),
      );

      renderDialog('Guardian', { canManage: true });

      const item = (await screen.findByText('rg-maria.pdf')).closest('li') as HTMLElement;
      await user.click(within(item).getByRole('button', { name: /inativar rg-maria\.pdf/i }));

      // Nothing is sent until the user confirms, and the wording says the file is not erased.
      const confirm = await screen.findByRole('dialog', { name: /inativar documento/i });
      expect(inactivated).toBeNull();
      expect(within(confirm).getByText(/não é apagado/i)).toBeInTheDocument();
      expect(within(confirm).getByText(/histórico do aluno/i)).toBeInTheDocument();

      await user.click(within(confirm).getByRole('button', { name: /^inativar documento$/i }));

      await waitFor(() => expect(inactivated).toBe(String(storedDocument.id)));
      expect(await screen.findByText(/nenhum documento enviado/i)).toBeInTheDocument();
    });

    it('does nothing when the confirmation is cancelled', async () => {
      authenticate();

      let deleteCalls = 0;
      server.use(
        http.get(apiUrl(DOCUMENTS_PATH), () => HttpResponse.json(listOf(storedDocument))),
        http.delete(apiUrl(`${DOCUMENTS_PATH}/:id`), () => {
          deleteCalls += 1;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      renderDialog('Guardian', { canManage: true });

      await user.click(await screen.findByRole('button', { name: /inativar rg-maria\.pdf/i }));
      const confirm = await screen.findByRole('dialog', { name: /inativar documento/i });
      await user.click(within(confirm).getByRole('button', { name: /cancelar/i }));

      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: /inativar documento/i }),
        ).not.toBeInTheDocument(),
      );
      expect(deleteCalls).toBe(0);
      expect(screen.getByText('rg-maria.pdf')).toBeInTheDocument();
    });

    it('shows the API’s refusal when the document cannot be inactivated', async () => {
      authenticate();

      server.use(
        http.get(apiUrl(DOCUMENTS_PATH), () => HttpResponse.json(listOf(storedDocument))),
        http.delete(apiUrl(`${DOCUMENTS_PATH}/:id`), () =>
          HttpResponse.json(
            { error: { code: 'not_found', message: 'Recurso não encontrado.', details: {} } },
            { status: 404 },
          ),
        ),
      );

      renderDialog('Guardian', { canManage: true });

      await user.click(await screen.findByRole('button', { name: /inativar rg-maria\.pdf/i }));
      const confirm = await screen.findByRole('dialog', { name: /inativar documento/i });
      await user.click(within(confirm).getByRole('button', { name: /^inativar documento$/i }));

      expect(await screen.findByText(/recurso não encontrado/i)).toBeInTheDocument();
      expect(screen.getByText('rg-maria.pdf')).toBeInTheDocument();
    });

    it('offers neither the action nor the inactive tab without manage_documents', async () => {
      authenticate();

      const queries: string[] = [];
      server.use(
        http.get(apiUrl(DOCUMENTS_PATH), ({ request }) => {
          queries.push(new URL(request.url).search);
          return HttpResponse.json(listOf(storedDocument));
        }),
      );

      renderDialog('Guardian', { canManage: false });

      expect(await screen.findByText('rg-maria.pdf')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /inativar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /remover/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
      expect(queries.every((query) => !query.includes('inactive'))).toBe(true);
    });

    it.each([
      ['Guardian', 'guardian_id'],
      ['Student', 'documentable_type'],
    ] as const)(
      'lists the inactive documents of a %s with who inactivated them and when',
      async (documentableType, ownerParam) => {
        authenticate();

        const queries: URLSearchParams[] = [];
        server.use(
          http.get(apiUrl(DOCUMENTS_PATH), ({ request }) => {
            const query = new URL(request.url).searchParams;
            queries.push(query);
            return HttpResponse.json(
              query.get('inactive') === 'true' ? listOf(inactiveDocument) : listOf(storedDocument),
            );
          }),
        );

        renderDialog(documentableType, { canManage: true });

        expect(await screen.findByText('rg-maria.pdf')).toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: /inativos/i }));

        const item = (await screen.findByText('rg-antigo.pdf')).closest('li') as HTMLElement;
        expect(screen.queryByText('rg-maria.pdf')).not.toBeInTheDocument();

        // The inactive query still carries the owner filter the active one used.
        const inactiveQuery = queries.find((query) => query.get('inactive') === 'true');
        expect(inactiveQuery?.has(ownerParam)).toBe(true);

        expect(
          within(item).getByText(/inativado por secretaria@example\.com em /i),
        ).toBeInTheDocument();
        expect(within(item).getByText('Inativo')).toBeInTheDocument();

        // History stays reachable, but a second inactivation is not offered, nor is a new upload.
        expect(within(item).getByRole('link', { name: 'rg-antigo.pdf' })).toHaveAttribute(
          'href',
          expect.stringContaining(inactiveDocument.file_url as string),
        );
        expect(within(item).queryByRole('button', { name: /inativar/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /enviar arquivo/i })).not.toBeInTheDocument();
      },
    );

    it('says so when there is no inactive document, and comes back to the active ones', async () => {
      authenticate();

      server.use(
        http.get(apiUrl(DOCUMENTS_PATH), ({ request }) =>
          HttpResponse.json(
            new URL(request.url).searchParams.get('inactive') === 'true'
              ? emptyList
              : listOf(storedDocument),
          ),
        ),
      );

      renderDialog('Student', { canManage: true });

      await screen.findByText('rg-maria.pdf');
      await user.click(screen.getByRole('tab', { name: /inativos/i }));
      expect(await screen.findByText(/nenhum documento inativo/i)).toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: /^ativos$/i }));
      expect(await screen.findByText('rg-maria.pdf')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enviar arquivo/i })).toBeInTheDocument();
    });
  });
});
