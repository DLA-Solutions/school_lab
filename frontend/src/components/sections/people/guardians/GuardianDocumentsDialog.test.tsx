import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import { SchoolDocument } from 'types/document';
import { Guardian } from 'types/guardian';
import GuardianDocumentsDialog from './GuardianDocumentsDialog';

const DOCUMENTS_PATH = `/api/v1/schools/${SCHOOL_ID}/documents`;

const user = userEvent.setup({ delay: null });

const guardian: Guardian = {
  id: 7,
  school_id: SCHOOL_ID,
  user_id: null,
  name: 'Maria Silva',
  cpf: '12345678909',
  email: 'maria@example.com',
  phone: '+55 11 99999-0000',
  zip_code: null,
  street: null,
  number: null,
  complement: null,
  neighborhood: null,
  city: null,
  state: null,
};

const storedDocument: SchoolDocument = {
  id: 31,
  school_id: SCHOOL_ID,
  documentable_type: 'Guardian',
  documentable_id: guardian.id,
  document_type: 'rg',
  status: 'pending',
  rejection_reason: null,
  reviewed_at: null,
  created_at: '2026-08-08T12:00:00Z',
  updated_at: '2026-08-08T12:00:00Z',
  filename: 'rg-maria.pdf',
  content_type: 'application/pdf',
  byte_size: 20480,
  file_url: '/rails/active_storage/blobs/abc/rg-maria.pdf',
};

const emptyList = { data: [], meta: { page: 1, per_page: 25, total: 0 } };

const renderDialog = () => {
  const onClose = vi.fn();

  renderWithTheme(
    <GuardianDocumentsDialog open schoolId={SCHOOL_ID} guardian={guardian} onClose={onClose} />,
  );

  return { onClose };
};

const authenticate = () => setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

describe('GuardianDocumentsDialog', () => {
  it('asks the API only for this guardian’s documents', async () => {
    authenticate();

    let requestedUrl = '';
    server.use(
      http.get(apiUrl(DOCUMENTS_PATH), ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({ data: [storedDocument], meta: { page: 1, per_page: 25, total: 1 } });
      }),
    );

    renderDialog();

    expect(await screen.findByText('rg-maria.pdf')).toBeInTheDocument();

    const query = new URL(requestedUrl).searchParams;
    expect(query.get('documentable_type')).toBe('Guardian');
    expect(query.get('documentable_id')).toBe(String(guardian.id));
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
        const form = await request.formData();
        const file = form.get('document[file]') as Blob;

        uploaded = {
          documentable_type: String(form.get('document[documentable_type]')),
          documentable_id: String(form.get('document[documentable_id]')),
          document_type: String(form.get('document[document_type]')),
          fileType: file.type,
          fileSize: file.size,
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
    expect(link).toHaveAttribute('href', expect.stringContaining(storedDocument.file_url as string));
  });

  it('removes a document and refreshes', async () => {
    authenticate();

    let deleted: number | null = null;
    let listCalls = 0;

    server.use(
      http.get(apiUrl(DOCUMENTS_PATH), () => {
        listCalls += 1;
        return HttpResponse.json(
          listCalls === 1
            ? { data: [storedDocument], meta: { page: 1, per_page: 25, total: 1 } }
            : emptyList,
        );
      }),
      http.delete(apiUrl(`${DOCUMENTS_PATH}/${storedDocument.id}`), ({ params }) => {
        deleted = Number(params.id ?? storedDocument.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderDialog();

    const item = (await screen.findByText('rg-maria.pdf')).closest('li') as HTMLElement;
    await user.click(within(item).getByRole('button', { name: /remover/i }));

    await waitFor(() => expect(deleted).toBe(storedDocument.id));
    expect(await screen.findByText(/nenhum documento enviado/i)).toBeInTheDocument();
  });
});
