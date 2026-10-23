import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, guardianMembership, http, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { withActiveMembership } from 'test/activeMembership';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import { GuardianDocument } from 'types/document';
import MyDocuments from './MyDocuments';

const BASE = `/api/v1/schools/${SCHOOL_ID}/me`;

// The browser's `accept` filter is not what is under test here: a wrong file can still get in
// (drag and drop, "all files"), and the page has to refuse it itself.
const user = userEvent.setup({ delay: null, applyAccept: false });

const document_ = (overrides: Partial<GuardianDocument> = {}): GuardianDocument => ({
  id: 1,
  school_id: SCHOOL_ID,
  documentable_type: 'Student',
  documentable_id: 9,
  document_type: 'vaccination_card',
  // A guardian upload is accepted automatically (BR-ARC18): it is born approved.
  status: 'approved',
  rejection_reason: null,
  reviewed_at: null,
  created_at: '2026-08-10T12:00:00Z',
  updated_at: '2026-08-10T12:00:00Z',
  filename: 'cartao-vacina.pdf',
  content_type: 'application/pdf',
  byte_size: 120_000,
  file_url: 'http://localhost:3000/rails/active_storage/blobs/redirect/signed/cartao-vacina.pdf',
  discarded_at: null,
  discarded_by_name: null,
  student_id: 9,
  student_name: 'Pedro Silva',
  uploaded_by_name: 'Maria Silva',
  uploaded_by_kind: 'guardian',
  ...overrides,
});

const mother = document_();
const father = document_({
  id: 2,
  document_type: 'address_proof',
  filename: 'comprovante-endereco.png',
  uploaded_by_name: 'João Silva',
});
const fromSchool = document_({
  id: 3,
  document_type: 'medical_report',
  filename: 'laudo.pdf',
  status: 'rejected',
  rejection_reason: 'Arquivo ilegível.',
  uploaded_by_name: null,
  uploaded_by_kind: 'school',
});

// Filed by the system once the contract is e-signed: no uploader, always approved.
const signedContract = document_({
  id: 4,
  document_type: 'signed_contract',
  status: 'approved',
  filename: 'contrato-assinado-pedro-silva.pdf',
  file_url: 'http://localhost:3000/rails/active_storage/blobs/redirect/signed/contrato.pdf',
  uploaded_by_name: null,
  uploaded_by_kind: null,
});

interface Sent {
  /** The text fields of the multipart body, by name. */
  fields: Record<string, string>;
  /** The raw body, for the file part: its bytes are re-encoded by the test environment. */
  body: string;
}

// `request.formData()` throws under this test environment, so the multipart body is read as text.
const parseMultipart = (body: string): Sent => {
  const fields: Record<string, string> = {};

  for (const match of body.matchAll(
    /name="([^"]+)"(?:; filename="[^"]*")?\r\n(?:[^\r\n]+\r\n)*\r\n([^\r]*)/g,
  )) {
    fields[match[1]] = match[2];
  }

  return { fields, body };
};

const stub = ({
  rows = [mother, father, fromSchool],
  students = [{ id: 9, name: 'Pedro Silva' }],
  postResponse,
}: {
  rows?: GuardianDocument[];
  students?: { id: number; name: string }[];
  postResponse?: () => Response;
} = {}) => {
  const sent: Sent[] = [];
  const listQueries: string[] = [];

  server.use(
    http.get(apiUrl(`${BASE}/students`), () =>
      HttpResponse.json({
        data: students,
        meta: { page: 1, per_page: 25, total: students.length },
      }),
    ),
    http.get(apiUrl(`${BASE}/documents`), ({ request }) => {
      const url = new URL(request.url);
      listQueries.push(url.search);
      const documentType = url.searchParams.get('document_type');
      const visible = documentType
        ? rows.filter((row) => row.document_type === documentType)
        : rows;

      return HttpResponse.json({
        data: visible,
        meta: { page: 1, per_page: 25, total: visible.length },
      });
    }),
    http.post(apiUrl(`${BASE}/documents`), async ({ request }) => {
      sent.push(parseMultipart(new TextDecoder('latin1').decode(await request.arrayBuffer())));

      return postResponse ? postResponse() : HttpResponse.json({ data: mother }, { status: 201 });
    }),
  );

  return { sent, listQueries };
};

const guardianUser: AuthUser = {
  id: 2,
  email: 'guardian@example.com',
  status: 'active',
  memberships: [guardianMembership],
  guardian_profiles: [{ id: 5 }],
};

const authValue: AuthContextValue = {
  user: guardianUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const renderPage = () => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(
    withActiveMembership([guardianMembership])(
      <MemoryRouter initialEntries={['/meus-documentos']}>
        <AuthContext.Provider value={authValue}>
          <MyDocuments />
        </AuthContext.Provider>
      </MemoryRouter>,
    ),
  );
};

const pdf = (name = 'vacina.pdf') => new File(['%PDF-1.4'], name, { type: 'application/pdf' });

const chooseType = async (name: string) => {
  await user.click(screen.getByLabelText(/tipo de documento/i));
  await user.click(await screen.findByRole('option', { name }));
};

const fileInput = () => screen.getByLabelText(/^arquivo$/i) as HTMLInputElement;

const fillAndSend = async (file: File = pdf()) => {
  await waitFor(() => expect(screen.getByLabelText(/^aluno/i)).toHaveTextContent('Pedro Silva'));
  await chooseType('Cartão de vacina');
  await user.upload(fileInput(), file);
  await user.click(screen.getByRole('button', { name: /enviar documento/i }));
};

const apiError =
  (status: number, code: string, details: Record<string, unknown> = {}) =>
  () =>
    HttpResponse.json({ error: { code, message: 'Mensagem do servidor.', details } }, { status });

describe('A guardian’s documents', () => {
  it('lists the documents of both parents, with who sent each, and no status column', async () => {
    stub();
    renderPage();

    expect(await screen.findByText('cartao-vacina.pdf')).toBeInTheDocument();
    expect(screen.getByText('comprovante-endereco.png')).toBeInTheDocument();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    // Sent by school staff: there is no parent name, so the column says who it was.
    expect(screen.getByText('Escola')).toBeInTheDocument();

    // Uploads are accepted on arrival, so the parents' screen has no status column or chips,
    // whatever status the row carries (a school-filed row here is even `rejected`).
    expect(screen.queryByRole('columnheader', { name: /situação/i })).not.toBeInTheDocument();
    for (const label of ['Aprovado', 'Em análise', 'Recusado']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/arquivo ilegível/i)).not.toBeInTheDocument();

    expect(screen.getAllByText('Pedro Silva').length).toBeGreaterThan(0);
    expect(screen.getByText('Cartão de vacina')).toBeInTheDocument();
    expect(screen.getByText('Comprovante de endereço')).toBeInTheDocument();
    expect(screen.getByText('Laudos')).toBeInTheDocument();
  });

  it('shows the signed contract the system filed, with no uploader', async () => {
    stub({ rows: [signedContract] });
    renderPage();

    expect(await screen.findByText('contrato-assinado-pedro-silva.pdf')).toBeInTheDocument();
    expect(screen.getByText('Contrato assinado')).toBeInTheDocument();
    expect(screen.getByText('Assinatura eletrônica')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /abrir contrato-assinado-pedro-silva\.pdf/i });
    expect(link).toHaveAttribute('href', signedContract.file_url);
  });

  it('does not offer the signed contract as a type to upload', async () => {
    stub({ rows: [signedContract] });
    renderPage();

    await screen.findByText('contrato-assinado-pedro-silva.pdf');
    await user.click(screen.getByLabelText(/tipo de documento/i));

    expect(await screen.findByRole('option', { name: 'Cartão de vacina' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Contrato assinado' })).not.toBeInTheDocument();
  });

  it('tells the guardian the documents are shared', async () => {
    stub();
    renderPage();

    expect(
      await screen.findByText(/visíveis para os outros responsáveis do aluno e para a escola/i),
    ).toBeInTheDocument();
  });

  it('opens a document in a new tab through its signed link', async () => {
    stub({ rows: [mother] });
    renderPage();

    const link = await screen.findByRole('link', { name: /abrir cartao-vacina\.pdf/i });

    expect(link).toHaveAttribute('href', mother.file_url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('shows an empty state that mentions the other parent', async () => {
    stub({ rows: [] });
    renderPage();

    expect(await screen.findByText('Nenhum documento enviado')).toBeInTheDocument();
    expect(screen.getByText(/o outro responsável do aluno também os vê/i)).toBeInTheDocument();
  });

  it('picks the only child for them and offers no filter', async () => {
    stub();
    renderPage();

    await waitFor(() => expect(screen.getByLabelText(/^aluno/i)).toHaveTextContent('Pedro Silva'));
    expect(screen.queryByLabelText(/filtrar por aluno/i)).not.toBeInTheDocument();
  });

  it('leaves the choice open and filters the list when there is more than one child', async () => {
    const { listQueries } = stub({
      students: [
        { id: 9, name: 'Pedro Silva' },
        { id: 10, name: 'Ana Silva' },
      ],
    });
    renderPage();

    await screen.findByText('cartao-vacina.pdf');
    const chooser = screen.getByLabelText(/^aluno/i);
    expect(chooser).not.toHaveTextContent('Pedro Silva');
    expect(chooser).not.toHaveTextContent('Ana Silva');

    await user.click(screen.getByLabelText(/filtrar por aluno/i));
    await user.click(await screen.findByRole('option', { name: 'Ana Silva' }));

    await waitFor(() =>
      expect(listQueries.some((query) => query.includes('student_id=10'))).toBe(true),
    );
  });

  describe('filtering by document type', () => {
    it('offers the filter even with one child, listing the guardian and system types', async () => {
      stub();
      renderPage();

      await screen.findByText('cartao-vacina.pdf');
      await user.click(screen.getByLabelText(/filtrar por tipo/i));

      expect(await screen.findByRole('option', { name: 'Todos os tipos' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Contrato assinado' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Cartão de vacina' })).toBeInTheDocument();
    });

    it('sends document_type and shows only the signed contract, then drops it on all types', async () => {
      const { listQueries } = stub({ rows: [mother, father, signedContract] });
      renderPage();

      await screen.findByText('cartao-vacina.pdf');
      expect(listQueries.every((query) => !query.includes('document_type'))).toBe(true);

      await user.click(screen.getByLabelText(/filtrar por tipo/i));
      await user.click(await screen.findByRole('option', { name: 'Contrato assinado' }));

      await waitFor(() =>
        expect(listQueries.some((query) => query.includes('document_type=signed_contract'))).toBe(
          true,
        ),
      );
      expect(await screen.findByText('contrato-assinado-pedro-silva.pdf')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByText('cartao-vacina.pdf')).not.toBeInTheDocument());
      expect(screen.queryByText('comprovante-endereco.png')).not.toBeInTheDocument();

      const before = listQueries.length;
      await user.click(screen.getByLabelText(/filtrar por tipo/i));
      await user.click(await screen.findByRole('option', { name: 'Todos os tipos' }));

      expect(await screen.findByText('cartao-vacina.pdf')).toBeInTheDocument();
      expect(listQueries.length).toBeGreaterThan(before);
      expect(listQueries[listQueries.length - 1]).not.toContain('document_type');
    });

    it('says nothing matched, rather than that nothing was sent, when the filter is empty', async () => {
      stub({ rows: [mother] });
      renderPage();

      await screen.findByText('cartao-vacina.pdf');
      await user.click(screen.getByLabelText(/filtrar por tipo/i));
      await user.click(await screen.findByRole('option', { name: 'Contrato assinado' }));

      expect(await screen.findByText('Nenhum documento encontrado')).toBeInTheDocument();
      expect(screen.queryByText('Nenhum documento enviado')).not.toBeInTheDocument();
    });
  });

  describe('sending a document', () => {
    it('sends the child, the type and the file as flat multipart fields, then refreshes', async () => {
      const { sent, listQueries } = stub();
      renderPage();

      await fillAndSend();

      await waitFor(() => expect(sent.length).toBe(1));
      expect(sent[0].fields.student_id).toBe('9');
      expect(sent[0].fields.document_type).toBe('vaccination_card');
      // The file rides as its own part, under the MIME type the browser reported.
      expect(sent[0].body).toMatch(/name="file"[^]*Content-Type: application\/pdf/);
      // The API has no title; sending one would only be ignored.
      expect(sent[0].fields).not.toHaveProperty('title');

      expect(await screen.findByText(/documento enviado\./i)).toBeInTheDocument();
      // Accepted on arrival: the notice promises no review, and the list never asks for inactive
      // documents (the API hides them from guardians anyway).
      expect(screen.queryByText(/vai analisar/i)).not.toBeInTheDocument();
      await waitFor(() => expect(listQueries.length).toBeGreaterThanOrEqual(2));
      expect(listQueries.every((query) => !query.includes('inactive'))).toBe(true);
    });

    it('offers the guardian document kinds in the API order', async () => {
      stub();
      renderPage();

      await waitFor(() =>
        expect(screen.getByLabelText(/^aluno/i)).toHaveTextContent('Pedro Silva'),
      );
      await user.click(screen.getByLabelText(/tipo de documento/i));

      const options = (await screen.findAllByRole('option')).map((option) => option.textContent);
      expect(options.slice(-7)).toEqual([
        'Comprovante de endereço',
        'Histórico escolar',
        'RG e CPF dos responsáveis',
        'Cartão de vacina',
        'Laudos',
        'Transferência de outra escola',
        'Outros',
      ]);
    });

    it.each([
      ['Histórico escolar', 'school_transcript'],
      ['RG e CPF dos responsáveis', 'guardian_identity'],
    ])('sends %s as %s', async (label, value) => {
      const { sent } = stub();
      renderPage();

      await waitFor(() =>
        expect(screen.getByLabelText(/^aluno/i)).toHaveTextContent('Pedro Silva'),
      );
      await chooseType(label);
      await user.upload(fileInput(), pdf());
      await user.click(screen.getByRole('button', { name: /enviar documento/i }));

      await waitFor(() => expect(sent.length).toBe(1));
      expect(sent[0].fields.document_type).toBe(value);
    });

    it('asks for the type and the file before sending anything', async () => {
      const { sent } = stub();
      renderPage();

      await waitFor(() =>
        expect(screen.getByLabelText(/^aluno/i)).toHaveTextContent('Pedro Silva'),
      );
      await user.click(screen.getByRole('button', { name: /enviar documento/i }));

      expect(await screen.findByText('Escolha o tipo de documento.')).toBeInTheDocument();
      expect(screen.getByText('Escolha o arquivo a enviar.')).toBeInTheDocument();
      expect(sent).toHaveLength(0);
    });

    it('refuses a file that is not a PDF, JPEG or PNG without sending it', async () => {
      const { sent } = stub();
      renderPage();

      await waitFor(() =>
        expect(screen.getByLabelText(/^aluno/i)).toHaveTextContent('Pedro Silva'),
      );
      await user.upload(fileInput(), new File(['x'], 'notas.txt', { type: 'text/plain' }));

      expect(await screen.findByText('Envie um arquivo PDF, JPEG ou PNG.')).toBeInTheDocument();
      expect(screen.queryByText('notas.txt')).not.toBeInTheDocument();
      expect(sent).toHaveLength(0);
    });

    it('refuses a file over 10 MB without sending it', async () => {
      const { sent } = stub();
      renderPage();

      await waitFor(() =>
        expect(screen.getByLabelText(/^aluno/i)).toHaveTextContent('Pedro Silva'),
      );
      const big = pdf('grande.pdf');
      Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 });
      await user.upload(fileInput(), big);

      expect(await screen.findByText(/o limite é de 10 mb/i)).toBeInTheDocument();
      expect(sent).toHaveLength(0);
    });

    it('shows the API’s 422 messages under the fields they belong to', async () => {
      stub({
        postResponse: apiError(422, 'validation_error', {
          document_type: ['não é válido'],
          file: ['não pode ficar em branco'],
        }),
      });
      renderPage();

      await fillAndSend();

      expect(await screen.findByText('não é válido')).toBeInTheDocument();
      expect(screen.getByText('não pode ficar em branco')).toBeInTheDocument();
    });

    it.each([
      ['unsupported_media_type', 'Envie um arquivo PDF, JPEG ou PNG.'],
      ['file_too_large', 'O arquivo é grande demais. O limite é de 10 MB.'],
    ])('maps the API’s %s to a friendly message', async (code, message) => {
      stub({ postResponse: apiError(422, code) });
      renderPage();

      await fillAndSend();

      expect(await screen.findByText(message)).toBeInTheDocument();
    });

    it('says so when the child is not one of theirs', async () => {
      stub({ postResponse: apiError(404, 'not_found') });
      renderPage();

      await fillAndSend();

      expect(await screen.findByText(/não encontramos este aluno/i)).toBeInTheDocument();
    });

    // The API answers 422 today and may answer 409 once another branch merges; the code, not the
    // status, is what says the child is not enrolled.
    it.each([422, 409])('explains an inactive student answered with %s', async (status) => {
      stub({ postResponse: apiError(status, 'student_inactive') });
      renderPage();

      await fillAndSend();

      expect(await screen.findByText(/não está com matrícula ativa/i)).toBeInTheDocument();
    });

    it('keeps the form usable after a failure', async () => {
      stub({ postResponse: apiError(404, 'not_found') });
      renderPage();

      await fillAndSend();
      await screen.findByText(/não encontramos este aluno/i);

      expect(screen.getByRole('button', { name: /enviar documento/i })).toBeEnabled();
    });
  });
});
