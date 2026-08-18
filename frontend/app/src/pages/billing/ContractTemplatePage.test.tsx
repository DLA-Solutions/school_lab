import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, staffMembership } from 'test/msw';
import { API_BASE_URL } from 'services/api';
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
  copy_emails: [],
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

  it('saves the body', async () => {
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

    await user.click(screen.getByRole('button', { name: /salvar modelo/i }));

    await waitFor(() => expect(received).toBeDefined());
    expect(received?.contract_template.body_html).toBe(template.body_html);
    // Where the signature lands is the provider's to decide now; the school no longer says.
    expect(received?.contract_template).not.toHaveProperty('signature_y');
  });

  // A line above the editor was easy to miss on a page this long, so the save is confirmed where
  // the eye already is and stays until it is acknowledged.
  it('confirms the save in a modal the user dismisses', async () => {
    authenticate();
    stubTemplate();
    server.use(http.put(apiUrl(PATH), () => HttpResponse.json({ data: template })));

    renderPage();
    await waitFor(() => expect(editor()).toHaveValue(template.body_html));

    await user.click(screen.getByRole('button', { name: /salvar modelo/i }));

    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText(/contrato salvo com sucesso/i)).toBeInTheDocument();

    await user.click(within(modal).getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
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
        const bodyText = new TextDecoder('latin1').decode(await request.arrayBuffer());
        parts = [];
        if (bodyText.includes('contract_template[logo]')) {
          parts.push('contract_template[logo]');
        }
        if (bodyText.includes('contract_template[body_html]')) {
          parts.push('contract_template[body_html]');
        }
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
      // A contract is a printed white page, and the preview HTML sets no background of its own —
      // so the frame has to paint one, or the dark page shows straight through it.
      // A contract is a printed white page, and the preview HTML sets no background of its own, so
      // the frame has to paint one or the dark page shows straight through it. Asserting the
      // resolved colour rather than "not transparent": `background: 'common.white'` — the CSS
      // shorthand, which `sx` does not resolve against the palette — silently left it at
      // rgba(0, 0, 0, 0), which is exactly the bug this guards.
      expect(getComputedStyle(frame).backgroundColor).toBe('var(--mui-palette-common-white)');
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
  // The blueprint returns the blob path host-relative, and the SPA is served from another origin
  // in development — so a bare `/rails/active_storage/...` resolved against the SPA and 404'd.
  // The image simply failed to render, which is how the logo looked broken.
  it('points the saved logo at the API, not at the SPA', async () => {
    authenticate();
    stubTemplate({
      logo_url: '/rails/active_storage/blobs/redirect/abc/logo.png',
      logo_filename: 'logo.png',
    });

    renderPage();

    const image = await screen.findByAltText('Logo atual');
    expect(image).toHaveAttribute('src', `${API_BASE_URL}/rails/active_storage/blobs/redirect/abc/logo.png`);
  });

  // Nothing was on screen between choosing an image and saving it, which read as the preview
  // being broken — the saved logo was hidden and the chosen file had nothing to show.
  it('shows the image that was just chosen, before it is saved', async () => {
    authenticate();
    stubTemplate();

    renderPage();
    await waitFor(() => expect(editor()).toHaveValue(template.body_html));

    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });

    expect(await screen.findByAltText('Logo escolhida')).toBeInTheDocument();
    expect(screen.getByText(/logo\.png/)).toBeInTheDocument();
  });
  // The school's own copy of every agreement that leaves. They are not signers: the provider
  // delivers the document and asks nothing of them.
  it('saves the copy recipients as a list, however they were typed', async () => {
    authenticate();
    stubTemplate({ copy_emails: ['secretaria@escola.com.br'] });

    let received: { contract_template: Record<string, unknown> } | undefined;
    server.use(
      http.put(apiUrl(PATH), async ({ request }) => {
        received = (await request.json()) as { contract_template: Record<string, unknown> };
        return HttpResponse.json({ data: template });
      }),
    );

    renderPage();

    const field = await screen.findByLabelText(/e-mails, separados por vírgula/i);
    await waitFor(() => expect(field).toHaveValue('secretaria@escola.com.br'));

    await user.clear(field);
    await user.type(field, 'colegionsrgo@gmail.com ,  direcao@escola.com.br');
    await user.click(screen.getByRole('button', { name: /salvar modelo/i }));

    await waitFor(() => expect(received).toBeDefined());
    expect(received?.contract_template.copy_emails).toEqual([
      'colegionsrgo@gmail.com',
      'direcao@escola.com.br',
    ]);
  });

  it('sends an empty list when the field is cleared', async () => {
    authenticate();
    stubTemplate({ copy_emails: ['secretaria@escola.com.br'] });

    let received: { contract_template: Record<string, unknown> } | undefined;
    server.use(
      http.put(apiUrl(PATH), async ({ request }) => {
        received = (await request.json()) as { contract_template: Record<string, unknown> };
        return HttpResponse.json({ data: template });
      }),
    );

    renderPage();
    await user.clear(await screen.findByLabelText(/e-mails, separados por vírgula/i));
    await user.click(screen.getByRole('button', { name: /salvar modelo/i }));

    await waitFor(() => expect(received).toBeDefined());
    expect(received?.contract_template.copy_emails).toEqual([]);
  });
});
