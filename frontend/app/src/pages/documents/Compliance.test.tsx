import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  COMPLIANCE_TYPES,
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  http,
  server,
  staffMembership,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { withActiveMembership } from 'test/activeMembership';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser, Membership } from 'types/auth';
import { ComplianceDocument } from 'types/complianceDocument';
import Compliance from './Compliance';

const PATH = `/api/v1/schools/${SCHOOL_ID}/compliance_documents`;

// The browser's `accept` filter is not what is under test here: a wrong file can still get in
// (drag and drop, "all files"), and the page has to refuse it itself.
const user = userEvent.setup({ delay: null, applyAccept: false });

const compliance = (overrides: Partial<ComplianceDocument> = {}): ComplianceDocument => ({
  id: 41,
  document_type: 'pest_control',
  document_type_label: 'Dedetização',
  status: 'approved',
  uploaded_by_id: 7,
  filename: 'dedetizacao-2026.pdf',
  content_type: 'application/pdf',
  byte_size: 183_204,
  file_url: '/rails/active_storage/blobs/redirect/signed/dedetizacao-2026.pdf',
  created_at: '2026-10-21T19:07:58Z',
  updated_at: '2026-10-21T19:07:59Z',
  ...overrides,
});

const renewal = compliance({
  id: 42,
  filename: 'dedetizacao-2027.pdf',
  created_at: '2027-10-21T19:07:58Z',
});
const original = compliance();
const fireCertificate = compliance({
  id: 43,
  document_type: 'fire_department_certificate',
  document_type_label: 'Certificado dos bombeiros',
  filename: 'avcb.pdf',
});

interface Sent {
  body: string;
}

const stub = ({
  rows = [renewal, original, fireCertificate],
  postResponse,
}: {
  rows?: ComplianceDocument[];
  postResponse?: () => Response;
} = {}) => {
  const state = { rows: [...rows] };
  const sent: Sent[] = [];
  const queries: string[] = [];
  const deleted: string[] = [];

  server.use(
    http.get(apiUrl(PATH), ({ request }) => {
      queries.push(new URL(request.url).search);
      return HttpResponse.json({
        data: state.rows,
        meta: { page: 1, per_page: 100, total: state.rows.length, types: COMPLIANCE_TYPES },
      });
    }),
    http.post(apiUrl(PATH), async ({ request }) => {
      // `request.formData()` throws under this test environment, so the body is read as text.
      sent.push({ body: new TextDecoder('latin1').decode(await request.arrayBuffer()) });

      return postResponse
        ? postResponse()
        : HttpResponse.json({ data: compliance({ id: 99 }) }, { status: 201 });
    }),
    http.delete(apiUrl(`${PATH}/:id`), ({ params }) => {
      deleted.push(String(params.id));
      state.rows = state.rows.filter((row) => String(row.id) !== params.id);

      return new HttpResponse(null, { status: 204 });
    }),
  );

  return { sent, queries, deleted, state };
};

const complianceMembership: Membership = {
  ...staffMembership,
  permissions: ['manage_documents'],
  permission_sources: { manage_documents: 'template' },
};

const authValueFor = (membership: Membership): AuthContextValue => {
  const authUser: AuthUser = {
    id: 1,
    email: 'admin@example.com',
    status: 'active',
    memberships: [membership],
    guardian_profiles: [],
  };

  return {
    user: authUser,
    status: 'authenticated',
    isAuthenticated: true,
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  };
};

const renderPage = (membership: Membership = complianceMembership) => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(
    withActiveMembership([membership])(
      <MemoryRouter initialEntries={['/compliance']}>
        <AuthContext.Provider value={authValueFor(membership)}>
          <Compliance />
        </AuthContext.Provider>
      </MemoryRouter>,
    ),
  );
};

const pdf = (name = 'alvara.pdf') => new File(['%PDF-1.4'], name, { type: 'application/pdf' });

const apiError =
  (status: number, code: string, details: Record<string, unknown> = {}) =>
  () =>
    HttpResponse.json({ error: { code, message: 'Mensagem do servidor.', details } }, { status });

/** The card (`<section>`-less Paper) that holds one type's title: its closest list/upload scope. */
const cardFor = (label: string) => {
  const heading = screen.getByText(label, { selector: 'h6' });
  const card = heading.closest('.MuiPaper-root') as HTMLElement;

  return within(card);
};

describe('Compliance documents', () => {
  it('shows one card per catalogue type, in catalogue order', async () => {
    stub();
    renderPage();

    await screen.findByText('avcb.pdf');

    // The first level-6 heading is the page title; the type cards follow it.
    const titles = screen.getAllByRole('heading', { level: 6 }).map((node) => node.textContent);
    expect(titles.slice(1)).toEqual(COMPLIANCE_TYPES.map((type) => type.label));
  });

  it('lists each type’s files newest first and says when a type has none', async () => {
    const { queries } = stub();
    renderPage();

    await screen.findByText('avcb.pdf');

    const pest = cardFor('Dedetização');
    const names = pest.getAllByText(/^dedetizacao-/).map((node) => node.textContent);
    expect(names).toEqual(['dedetizacao-2027.pdf', 'dedetizacao-2026.pdf']);

    expect(cardFor('Certificado dos bombeiros').getByText('avcb.pdf')).toBeInTheDocument();
    // Five of the seven types have no file yet: staff see what is missing.
    expect(screen.getAllByText('Nenhum arquivo enviado')).toHaveLength(5);
    expect(cardFor('Vigilância sanitária').getByText('Nenhum arquivo enviado')).toBeInTheDocument();

    expect(queries[0]).toContain('per_page=100');
  });

  it('opens a file through its signed URL', async () => {
    stub();
    renderPage();

    await screen.findByText('avcb.pdf');

    const link = cardFor('Certificado dos bombeiros').getByRole('link', {
      name: /abrir avcb\.pdf/i,
    });
    expect(link).toHaveAttribute('href', expect.stringContaining('/rails/active_storage/'));
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('uploads under the chosen type and lists the file straight away', async () => {
    const { sent, state } = stub({ rows: [] });
    renderPage();

    await screen.findAllByText('Nenhum arquivo enviado');

    // The reload after the upload finds the new file.
    server.use(
      http.post(apiUrl(PATH), async ({ request }) => {
        sent.push({ body: new TextDecoder('latin1').decode(await request.arrayBuffer()) });
        state.rows = [fireCertificate];

        return HttpResponse.json({ data: fireCertificate }, { status: 201 });
      }),
    );

    await user.upload(screen.getByLabelText('Enviar arquivo de Certificado dos bombeiros'), pdf());

    expect(await screen.findByText('avcb.pdf')).toBeInTheDocument();
    expect(screen.getByText(/arquivo enviado em "certificado dos bombeiros"/i)).toBeInTheDocument();

    expect(sent).toHaveLength(1);
    expect(sent[0].body).toMatch(/name="document_type"\r\n\r\nfire_department_certificate/);
    // The test environment re-encodes the file part, so only its field name and type are stable.
    expect(sent[0].body).toMatch(/name="file"[^]*Content-Type: application\/pdf/);
    // The API does not store a title, so none is sent.
    expect(sent[0].body).not.toMatch(/name="title"/);
  });

  it('shows the API’s refusal next to the card when the upload is rejected', async () => {
    stub({ postResponse: apiError(422, 'unsupported_media_type') });
    renderPage();

    await screen.findByText('avcb.pdf');
    await user.upload(screen.getByLabelText('Enviar arquivo de Dedetização'), pdf());

    expect(
      await cardFor('Dedetização').findByText('Envie um arquivo PDF, JPEG ou PNG.'),
    ).toBeInTheDocument();
  });

  it('maps a validation error’s field details to the card', async () => {
    stub({ postResponse: apiError(422, 'validation_error', { file: ['arquivo inválido'] }) });
    renderPage();

    await screen.findByText('avcb.pdf');
    await user.upload(screen.getByLabelText('Enviar arquivo de Dedetização'), pdf());

    expect(await screen.findByText('arquivo inválido')).toBeInTheDocument();
  });

  it('maps file_too_large from the API to a friendly message', async () => {
    stub({ postResponse: apiError(422, 'file_too_large') });
    renderPage();

    await screen.findByText('avcb.pdf');
    await user.upload(screen.getByLabelText('Enviar arquivo de Dedetização'), pdf());

    expect(await screen.findByText(/o limite é de 10 mb/i)).toBeInTheDocument();
  });

  it('refuses a wrong file type or an oversized file before uploading', async () => {
    const { sent } = stub();
    renderPage();

    await screen.findByText('avcb.pdf');

    const input = screen.getByLabelText('Enviar arquivo de Dedetização');
    await user.upload(
      input,
      new File(['x'], 'planilha.xlsx', { type: 'application/vnd.ms-excel' }),
    );
    expect(await screen.findByText('Envie um arquivo PDF, JPEG ou PNG.')).toBeInTheDocument();

    const big = new File(['x'], 'grande.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    await user.upload(input, big);
    expect(await screen.findByText(/o limite é de 10 mb/i)).toBeInTheDocument();

    expect(sent).toHaveLength(0);
  });

  it('removes a file only after confirmation', async () => {
    const { deleted } = stub();
    renderPage();

    await screen.findByText('avcb.pdf');

    await user.click(screen.getByRole('button', { name: /remover avcb\.pdf/i }));
    const dialog = await screen.findByRole('dialog');
    expect(deleted).toHaveLength(0);

    // Cancelling leaves the file alone.
    await user.click(within(dialog).getByRole('button', { name: /cancelar/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(deleted).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /remover avcb\.pdf/i }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: /^remover$/i }),
    );

    await waitFor(() => expect(deleted).toEqual(['43']));
    expect(await screen.findByText('Arquivo removido.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('avcb.pdf')).not.toBeInTheDocument());
  });

  it('shows the API message and a retry when the list fails', async () => {
    server.use(http.get(apiUrl(PATH), apiError(500, 'internal_error')));
    renderPage();

    expect(await screen.findByText('Mensagem do servidor.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument();
  });

  it('shows the no-access state when the API answers 403', async () => {
    server.use(http.get(apiUrl(PATH), apiError(403, 'forbidden')));
    renderPage();

    expect(await screen.findByText('Sem acesso a esta área')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum arquivo enviado')).not.toBeInTheDocument();
  });

  it('says so when the documents module is off for the school', async () => {
    server.use(http.get(apiUrl(PATH), apiError(403, 'module_disabled')));
    renderPage();

    expect(await screen.findByText(/módulo de documentos não está ativo/i)).toBeInTheDocument();
  });

  it('does not call the API for staff without manage_documents', async () => {
    const requested = vi.fn();
    server.use(
      http.get(apiUrl(PATH), () => {
        requested();
        return HttpResponse.json({
          data: [],
          meta: { page: 1, per_page: 100, total: 0, types: [] },
        });
      }),
    );

    renderPage({ ...staffMembership, permissions: ['manage_people'] });

    expect(await screen.findByText('Sem acesso a esta área')).toBeInTheDocument();
    expect(requested).not.toHaveBeenCalled();
  });
});
