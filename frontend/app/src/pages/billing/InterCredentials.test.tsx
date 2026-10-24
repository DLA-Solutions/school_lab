import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, jsonError, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import InterCredentials from './InterCredentials';

const PATH = `/api/v1/schools/${SCHOOL_ID}/bank_credentials`;

const user = userEvent.setup({ delay: null });

const credential = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  school_id: SCHOOL_ID,
  instrument: 'bank_slip',
  provider: 'inter',
  active: true,
  client_id: 'inter-client-001',
  certificate_fingerprint: 'SHA256:AB:CD:EF:12:34',
  certificate_expires_at: '2027-12-31T23:59:59Z',
  uploaded_at: '2026-08-10T12:00:00Z',
  uploaded_by_id: 1,
  ...overrides,
});

const pemFile = (name: string) =>
  new File(['-----BEGIN CERTIFICATE-----'], name, { type: 'application/x-pem-file' });

const renderPage = () => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(<InterCredentials />);
};

const fillForm = async () => {
  await user.type(await screen.findByLabelText(/client id/i), 'inter-client-new');
  await user.type(screen.getByLabelText(/client secret/i), 'inter-secret-new');
  const inputs = document.querySelectorAll('input[type="file"]');
  await user.upload(inputs[0] as HTMLInputElement, pemFile('inter.crt'));
  await user.upload(inputs[1] as HTMLInputElement, pemFile('inter.key'));
};

const sendButton = () => screen.getByRole('button', { name: /enviar credenciais/i });

describe('InterCredentials page', () => {
  it('says the school has no Inter credentials yet and where to get them', async () => {
    server.use(http.get(apiUrl(PATH), () => HttpResponse.json({ data: [] })));

    renderPage();

    expect(await screen.findByText(/não configurada/i)).toBeInTheDocument();
    expect(screen.getByText(/ainda não tem credenciais do banco inter/i)).toBeInTheDocument();
    expect(screen.getByText(/nova integração/i)).toBeInTheDocument();
    expect(screen.getByText(/boleto-cobranca\.read e boleto-cobranca\.write/i)).toBeInTheDocument();
    expect(screen.queryByText(/substitui essa configuração/i)).not.toBeInTheDocument();
  });

  // The secret, certificate and key never come back from the API: metadata is all there is.
  it('shows the Inter status, fingerprint and validity when it is active', async () => {
    server.use(http.get(apiUrl(PATH), () => HttpResponse.json({ data: [credential()] })));

    renderPage();

    expect(await screen.findByText('inter-client-001')).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.getByText('SHA256:AB:CD:EF:12:34')).toBeInTheDocument();
    expect(screen.getByText('31/12/2027')).toBeInTheDocument();
    expect(screen.queryByText(/substitui essa configuração/i)).not.toBeInTheDocument();
  });

  it('will not submit until client id, secret and both files are given', async () => {
    server.use(http.get(apiUrl(PATH), () => HttpResponse.json({ data: [] })));

    renderPage();
    await screen.findByText(/não configurada/i);

    expect(sendButton()).toBeDisabled();

    await user.type(screen.getByLabelText(/client id/i), 'inter-client-new');
    await user.type(screen.getByLabelText(/client secret/i), 'inter-secret-new');
    expect(sendButton()).toBeDisabled();

    const inputs = document.querySelectorAll('input[type="file"]');
    await user.upload(inputs[0] as HTMLInputElement, pemFile('inter.crt'));
    expect(sendButton()).toBeDisabled();

    await user.upload(inputs[1] as HTMLInputElement, pemFile('inter.key'));
    expect(sendButton()).toBeEnabled();
  });

  it('uploads the Inter credentials, reports success and clears the secret', async () => {
    let received: string | undefined;
    let stored = false;
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json({ data: stored ? [credential()] : [] })),
      http.post(apiUrl(PATH), async ({ request }) => {
        // `request.formData()` throws under this test environment — read the multipart body as text.
        received = new TextDecoder('latin1').decode(await request.arrayBuffer());
        stored = true;
        return HttpResponse.json({ data: credential() }, { status: 201 });
      }),
    );

    renderPage();
    await fillForm();
    await user.click(sendButton());

    await waitFor(() => expect(received).toBeDefined());
    expect(received).toMatch(/name="provider"\r\n\r\ninter\r\n/);
    expect(received).toMatch(/name="instrument"\r\n\r\nbank_slip\r\n/);
    expect(received).toContain('name="client_id"');
    expect(received).toContain('inter-client-new');
    expect(received).toContain('name="client_secret"');
    expect(received).toContain('inter-secret-new');
    expect(received).toContain('name="certificate"');
    expect(received).toContain('name="private_key"');

    expect(await screen.findByText(/enviadas e validadas com sucesso/i)).toBeInTheDocument();
    expect(await screen.findByText('inter-client-001')).toBeInTheDocument();
    expect(screen.getByLabelText(/client secret/i)).toHaveValue('');
    expect(screen.getByLabelText(/client id/i)).toHaveValue('');
  });

  it('reports the field errors the API returns on a 422', async () => {
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json({ data: [] })),
      http.post(apiUrl(PATH), () =>
        jsonError(422, 'validation_error', 'Dados inválidos', {
          client_id: ['não pode ficar em branco'],
          client_secret: ['é inválido'],
          certificate: ['expirou'],
          private_key: ['não corresponde ao certificado'],
        }),
      ),
    );

    renderPage();
    await fillForm();
    await user.click(sendButton());

    expect(await screen.findByText('Client ID: não pode ficar em branco')).toBeInTheDocument();
    expect(screen.getByText('Client Secret: é inválido')).toBeInTheDocument();
    expect(screen.getByText('Certificado: expirou')).toBeInTheDocument();
    expect(screen.getByText('Chave privada: não corresponde ao certificado')).toBeInTheDocument();
    expect(screen.queryByText(/enviadas e validadas/i)).not.toBeInTheDocument();
  });

  it('falls back to a connection message when the request itself fails', async () => {
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json({ data: [] })),
      http.post(apiUrl(PATH), () => HttpResponse.error()),
    );

    renderPage();
    await fillForm();
    await user.click(sendButton());

    expect(await screen.findByText(/verifique sua conexão/i)).toBeInTheDocument();
  });

  describe('when another provider is active', () => {
    const cora = credential({ provider: 'cora', client_id: 'cora-client-001' });

    it('warns up front that the upload replaces Cora and does not show Cora as Inter', async () => {
      server.use(http.get(apiUrl(PATH), () => HttpResponse.json({ data: [cora] })));

      renderPage();

      expect(await screen.findByText(/hoje o provedor de boletos ativo é cora/i)).toBeInTheDocument();
      expect(screen.getByText(/não configurada/i)).toBeInTheDocument();
      expect(screen.queryByText('cora-client-001')).not.toBeInTheDocument();
    });

    it('asks for confirmation and sends nothing when the school backs out', async () => {
      let posted = false;
      server.use(
        http.get(apiUrl(PATH), () => HttpResponse.json({ data: [cora] })),
        http.post(apiUrl(PATH), () => {
          posted = true;
          return HttpResponse.json({ data: credential() }, { status: 201 });
        }),
      );

      renderPage();
      await screen.findByText(/hoje o provedor de boletos ativo é cora/i);
      await fillForm();
      await user.click(sendButton());

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText(/substituir o provedor de boletos/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/configuração ativa de cora será substituída/i)).toBeInTheDocument();
      expect(posted).toBe(false);

      await user.click(within(dialog).getByRole('button', { name: /cancelar/i }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(posted).toBe(false);
      // The form keeps what was typed, so backing out costs the school nothing.
      expect(screen.getByLabelText(/client id/i)).toHaveValue('inter-client-new');
    });

    it('uploads once the school confirms the replacement', async () => {
      let received: string | undefined;
      let stored = false;
      server.use(
        http.get(apiUrl(PATH), () =>
          HttpResponse.json({ data: stored ? [credential()] : [cora] }),
        ),
        http.post(apiUrl(PATH), async ({ request }) => {
          received = new TextDecoder('latin1').decode(await request.arrayBuffer());
          stored = true;
          return HttpResponse.json({ data: credential() }, { status: 201 });
        }),
      );

      renderPage();
      await screen.findByText(/hoje o provedor de boletos ativo é cora/i);
      await fillForm();
      await user.click(sendButton());
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', {
          name: /substituir e enviar/i,
        }),
      );

      await waitFor(() => expect(received).toBeDefined());
      expect(received).toMatch(/name="provider"\r\n\r\ninter\r\n/);
      expect(await screen.findByText('inter-client-001')).toBeInTheDocument();
      expect(screen.queryByText(/hoje o provedor de boletos ativo/i)).not.toBeInTheDocument();
    });

    it('does not ask again to rotate Inter credentials already in place', async () => {
      let posted = false;
      server.use(
        http.get(apiUrl(PATH), () => HttpResponse.json({ data: [credential()] })),
        http.post(apiUrl(PATH), () => {
          posted = true;
          return HttpResponse.json({ data: credential() }, { status: 201 });
        }),
      );

      renderPage();
      await screen.findByText('inter-client-001');
      await fillForm();
      await user.click(sendButton());

      await waitFor(() => expect(posted).toBe(true));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
