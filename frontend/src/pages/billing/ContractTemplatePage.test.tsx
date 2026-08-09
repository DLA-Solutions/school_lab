import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser } from 'types/auth';
import { ContractTemplate } from 'types/contractTemplate';
import ContractTemplatePage from './ContractTemplatePage';

const PATH = `/api/v1/schools/${SCHOOL_ID}/billing/contract_template`;

const user = userEvent.setup({ delay: null });

const template: ContractTemplate = {
  id: 1,
  school_id: SCHOOL_ID,
  body_html: '<h1>Contrato</h1><p>{{aluno.nome}}</p>',
  signature_x: '10.0',
  signature_y: '85.0',
  signature_page: 1,
  logo_url: null,
  logo_filename: null,
  variables: [
    { token: 'aluno.nome', description: 'Nome do aluno' },
    { token: 'contrato.valor', description: 'Mensalidade' },
    { token: 'responsaveis', description: 'Bloco com os responsáveis' },
  ],
  updated_at: '2026-08-10T12:00:00Z',
};

const staffUser: AuthUser = {
  id: 1,
  email: 'admin@example.com',
  status: 'active',
  memberships: [
    {
      id: 1,
      school_id: SCHOOL_ID,
      school_name: 'Escola Demo',
      role: 'school',
      status: 'active',
      email: 'admin@example.com',
    },
  ],
  guardian_profiles: [],
};

const authValue: AuthContextValue = {
  user: staffUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
};

const renderPage = () =>
  renderWithTheme(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <ContractTemplatePage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

const stubTemplate = (override: Partial<ContractTemplate> = {}) =>
  server.use(http.get(apiUrl(PATH), () => HttpResponse.json({ data: { ...template, ...override } })));

const editor = () => screen.getByLabelText(/corpo do contrato em html/i);

const authenticate = () => setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

describe('ContractTemplatePage', () => {
  it('loads the school’s agreement into the editor', async () => {
    authenticate();
    stubTemplate();

    renderPage();

    await waitFor(() => expect(editor()).toHaveValue(template.body_html));
  });

  it('offers the variables the API reports', async () => {
    authenticate();
    stubTemplate();

    renderPage();

    expect(await screen.findByText('{{aluno.nome}}')).toBeInTheDocument();
    expect(screen.getByText('{{responsaveis}}')).toBeInTheDocument();
  });

  // Clicking a variable has to land it where the caret is, not at the end of the document.
  it('inserts a variable at the cursor', async () => {
    authenticate();
    stubTemplate({ body_html: 'INICIO|FIM' });

    renderPage();
    await waitFor(() => expect(editor()).toHaveValue('INICIO|FIM'));

    const field = editor() as HTMLTextAreaElement;
    field.focus();
    field.setSelectionRange(7, 7);

    await user.click(screen.getByText('{{contrato.valor}}'));

    await waitFor(() => expect(editor()).toHaveValue('INICIO|{{contrato.valor}}FIM'));
  });

  it('saves the body and the signature position', async () => {
    authenticate();
    stubTemplate();

    let received: { contract_template: Record<string, unknown> } | undefined;
    server.use(
      http.put(apiUrl(PATH), async ({ request }) => {
        received = (await request.json()) as { contract_template: Record<string, unknown> };
        return HttpResponse.json({ data: template });
      }),
    );

    renderPage();
    await waitFor(() => expect(editor()).toHaveValue(template.body_html));

    await user.clear(screen.getByLabelText(/^y \(%\)/i));
    await user.type(screen.getByLabelText(/^y \(%\)/i), '92');
    await user.click(screen.getByRole('button', { name: /salvar modelo/i }));

    await waitFor(() => expect(received).toBeDefined());
    expect(received?.contract_template.signature_y).toBe(92);
    expect(received?.contract_template.body_html).toBe(template.body_html);
  });

  // The logo cannot travel in a JSON body, so a save carrying one goes up as multipart.
  it('uploads the logo as multipart', async () => {
    authenticate();
    stubTemplate();

    let contentType: string | null = null;
    let parts: string[] = [];
    server.use(
      http.put(apiUrl(PATH), async ({ request }) => {
        contentType = request.headers.get('Content-Type');
        const form = await request.formData();
        parts = [...form.keys()];
        return HttpResponse.json({ data: { ...template, logo_filename: 'timbrado.png' } });
      }),
    );

    renderPage();
    await waitFor(() => expect(editor()).toHaveValue(template.body_html));

    const file = new File(['png'], 'timbrado.png', { type: 'image/png' });
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);
    await user.click(screen.getByRole('button', { name: /salvar modelo/i }));

    await waitFor(() => expect(contentType).toMatch(/^multipart\/form-data/));
    expect(parts).toContain('contract_template[logo]');
    expect(parts).toContain('contract_template[body_html]');
  });

  it('refuses a logo that is not an image', async () => {
    authenticate();
    stubTemplate();

    renderPage();
    await waitFor(() => expect(editor()).toHaveValue(template.body_html));

    // `user.upload` honours the input's `accept`, so it would never deliver this file. A real
    // browser will, when someone picks "all files" in the dialog — which is the case the guard
    // exists for, so the change event is dispatched directly.
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['%PDF'], 'contrato.pdf', { type: 'application/pdf' })] },
    });

    expect(await screen.findByText(/precisa ser uma imagem/i)).toBeInTheDocument();
  });

  describe('preview', () => {
    it('renders the document the API returns in a sandboxed frame', async () => {
      authenticate();
      stubTemplate();
      server.use(
        http.get(apiUrl(`${PATH}/preview`), () =>
          HttpResponse.json({ data: { html: '<html><body>Pedro Silva</body></html>', sample: true } }),
        ),
      );

      renderPage();
      await waitFor(() => expect(editor()).toHaveValue(template.body_html));

      await user.click(screen.getByRole('tab', { name: /pré-visualização/i }));

      const frame = await screen.findByTitle('Pré-visualização do contrato');
      expect(frame).toHaveAttribute('srcdoc', expect.stringContaining('Pedro Silva'));
      // Nothing inside the preview may run, whatever the HTML contains.
      expect(frame).toHaveAttribute('sandbox', '');
    });

    it('says when it is showing stand-in data', async () => {
      authenticate();
      stubTemplate();
      server.use(
        http.get(apiUrl(`${PATH}/preview`), () =>
          HttpResponse.json({ data: { html: '<html></html>', sample: true } }),
        ),
      );

      renderPage();
      await waitFor(() => expect(editor()).toHaveValue(template.body_html));

      await user.click(screen.getByRole('tab', { name: /pré-visualização/i }));

      expect(await screen.findByText(/dados de exemplo/i)).toBeInTheDocument();
    });

    it('says when it is showing a real contract', async () => {
      authenticate();
      stubTemplate();
      server.use(
        http.get(apiUrl(`${PATH}/preview`), () =>
          HttpResponse.json({ data: { html: '<html></html>', sample: false } }),
        ),
      );

      renderPage();
      await waitFor(() => expect(editor()).toHaveValue(template.body_html));

      await user.click(screen.getByRole('tab', { name: /pré-visualização/i }));

      expect(await screen.findByText(/contrato mais recente/i)).toBeInTheDocument();
    });
  });

  it('reports what the API refused', async () => {
    authenticate();
    stubTemplate();
    server.use(
      http.put(apiUrl(PATH), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Dados inválidos.',
              details: { body_html: ['não pode ficar em branco'] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    renderPage();
    await waitFor(() => expect(editor()).toHaveValue(template.body_html));

    await user.click(screen.getByRole('button', { name: /salvar modelo/i }));

    expect(await screen.findByText('não pode ficar em branco')).toBeInTheDocument();
  });
});
