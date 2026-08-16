import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, jsonError, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import BankCredentialsCard from './BankCredentialsCard';

const PATH = `/api/v1/schools/${SCHOOL_ID}/bank_credentials`;

const user = userEvent.setup({ delay: null });

const credential = {
  id: 1,
  school_id: SCHOOL_ID,
  instrument: 'bank_slip',
  provider: 'cora',
  active: true,
  client_id: 'client-live-001',
  certificate_fingerprint: 'SHA256:AB:CD:EF:12:34',
  certificate_expires_at: '2027-12-31T23:59:59Z',
  uploaded_at: '2026-08-10T12:00:00Z',
  uploaded_by_id: 1,
};

const pemFile = (name: string) =>
  new File(['-----BEGIN CERTIFICATE-----'], name, { type: 'application/x-pem-file' });

const renderCard = () => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(<BankCredentialsCard schoolId={SCHOOL_ID} />);
};

const fillForm = async () => {
  await user.type(await screen.findByLabelText(/client id/i), 'client-stage-001');
  const inputs = document.querySelectorAll('input[type="file"]');
  await user.upload(inputs[0] as HTMLInputElement, pemFile('cora.pem'));
  await user.upload(inputs[1] as HTMLInputElement, pemFile('cora.key'));
};

describe('BankCredentialsCard', () => {
  it('says when the school has no credentials yet', async () => {
    server.use(http.get(apiUrl(PATH), () => HttpResponse.json({ data: [] })));

    renderCard();

    expect(await screen.findByText(/não configurada/i)).toBeInTheDocument();
    expect(screen.getByText(/nenhum boleto pode ser emitido/i)).toBeInTheDocument();
  });

  // The PEM bodies never come back from the API, so metadata is all this can show.
  it('shows what is on file when credentials are active', async () => {
    server.use(http.get(apiUrl(PATH), () => HttpResponse.json({ data: [credential] })));

    renderCard();

    expect(await screen.findByText('client-live-001')).toBeInTheDocument();
    expect(screen.getByText('SHA256:AB:CD:EF:12:34')).toBeInTheDocument();
    expect(screen.getByText('31/12/2027')).toBeInTheDocument();
  });

  it('uploads the certificate and the private key', async () => {
    let received: FormData | undefined;
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json({ data: [] })),
      http.post(apiUrl(PATH), async ({ request }) => {
        received = await request.formData();
        return HttpResponse.json({ data: credential }, { status: 201 });
      }),
    );

    renderCard();
    await fillForm();
    await user.click(screen.getByRole('button', { name: /enviar credenciais/i }));

    await waitFor(() => expect(received).toBeDefined());
    expect(received?.get('provider')).toBe('cora');
    expect(received?.get('client_id')).toBe('client-stage-001');
    expect(typeof received?.get('certificate')).toBe('object');
    expect(typeof received?.get('private_key')).toBe('object');
  });

  // An expired certificate is refused here rather than at the bank, with a charge in flight.
  it('reports the certificate rules the API enforces', async () => {
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json({ data: [] })),
      http.post(apiUrl(PATH), () =>
        jsonError(422, 'validation_error', 'Dados inválidos', {
          certificate_pem: ['expirou'],
          private_key_pem: ['não corresponde ao certificado'],
        }),
      ),
    );

    renderCard();
    await fillForm();
    await user.click(screen.getByRole('button', { name: /enviar credenciais/i }));

    expect(await screen.findByText('Certificado: expirou')).toBeInTheDocument();
    expect(screen.getByText('Chave privada: não corresponde ao certificado')).toBeInTheDocument();
  });

  it('will not submit until both files and the client id are given', async () => {
    server.use(http.get(apiUrl(PATH), () => HttpResponse.json({ data: [] })));

    renderCard();
    const submit = await screen.findByRole('button', { name: /enviar credenciais/i });

    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/client id/i), 'client-stage-001');
    expect(submit).toBeDisabled();

    const inputs = document.querySelectorAll('input[type="file"]');
    await user.upload(inputs[0] as HTMLInputElement, pemFile('cora.pem'));
    expect(submit).toBeDisabled();

    await user.upload(inputs[1] as HTMLInputElement, pemFile('cora.key'));
    expect(submit).toBeEnabled();
  });

  // This card sits inside the billing settings form, so a bare button would submit that instead
  // of uploading anything.
  it('does not submit the form it is nested in', async () => {
    server.use(http.get(apiUrl(PATH), () => HttpResponse.json({ data: [] })));

    renderCard();

    const submit = await screen.findByRole('button', { name: /enviar credenciais/i });
    expect(submit).toHaveAttribute('type', 'button');
  });

  // A school whose billing is not set up yet has nothing to list, and the upload below is what
  // fixes that — so an empty listing is not reported as a fault.
  it('stays quiet when the listing cannot be read', async () => {
    server.use(http.get(apiUrl(PATH), () => jsonError(403, 'forbidden', 'Não autorizado')));

    renderCard();

    expect(await screen.findByText(/não configurada/i)).toBeInTheDocument();
    expect(screen.queryByText(/verifique sua conexão/i)).not.toBeInTheDocument();
  });
});
