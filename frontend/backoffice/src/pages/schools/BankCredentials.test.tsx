import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import {
  ACCESS_EXPIRES_AT,
  FRESH_ACCESS_TOKEN,
  HttpResponse,
  apiUrl,
  backofficeUser,
  bankCredentialsBySchool,
  http,
  jsonError,
  sampleBankCredential,
  server,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import paths from 'routes/paths';
import BankCredentials from './BankCredentials';

const SCHOOL_ID = 3;
const credentialsPath = paths.bankCredentials(SCHOOL_ID);

const user = userEvent.setup({ delay: null });

const backofficeAuth: AuthContextValue = {
  user: backofficeUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const renderPage = () => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter initialEntries={[credentialsPath]}>
      <AuthContext.Provider value={backofficeAuth}>
        <Routes>
          <Route path="schools/:schoolId/bank-credentials" element={<BankCredentials />} />
          <Route path={paths.schools} element={<div>Escolas</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

/** The API takes the files themselves, so the form is only fillable with real `File`s. */
const pemFile = (name: string) =>
  new File(['-----BEGIN CERTIFICATE-----'], name, { type: 'application/x-pem-file' });

const fillForm = async () => {
  await user.type(await screen.findByLabelText(/client id/i), 'client-stage-001');
  await user.upload(
    document.querySelector('input[type="file"]') as HTMLInputElement,
    pemFile('cora.pem'),
  );
  await user.upload(
    document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement,
    pemFile('cora.key'),
  );
};

beforeEach(() => {
  delete bankCredentialsBySchool[SCHOOL_ID];
});

describe('BankCredentials page', () => {
  it('says when a school has no credentials yet', async () => {
    renderPage();

    expect(await screen.findByText(/não configurada/i)).toBeInTheDocument();
    expect(screen.getByText(/nenhum boleto pode ser emitido/i)).toBeInTheDocument();
  });

  // The PEM bodies never come back from the API, so metadata is all this screen can show.
  it('shows what is on file when credentials are active', async () => {
    bankCredentialsBySchool[SCHOOL_ID] = [sampleBankCredential(SCHOOL_ID, 'client-live-001')];

    renderPage();

    expect(await screen.findByText('client-live-001')).toBeInTheDocument();
    expect(screen.getByText('SHA256:AB:CD:EF:12:34')).toBeInTheDocument();
    expect(screen.getByText('31/12/2027')).toBeInTheDocument();
    expect(screen.getByText(/^Ativa$/)).toBeInTheDocument();
  });

  it('uploads the certificate and the private key', async () => {
    let received: FormData | undefined;
    server.use(
      http.post(apiUrl(`/api/v1/schools/${SCHOOL_ID}/bank_credentials`), async ({ request }) => {
        received = await request.formData();
        const created = sampleBankCredential(SCHOOL_ID, 'client-stage-001');
        bankCredentialsBySchool[SCHOOL_ID] = [created];
        return HttpResponse.json({ data: created }, { status: 201 });
      }),
    );

    renderPage();
    await fillForm();
    await user.click(screen.getByRole('button', { name: /enviar credenciais/i }));

    await waitFor(() => expect(received).toBeDefined());
    expect(received?.get('provider')).toBe('cora');
    expect(received?.get('client_id')).toBe('client-stage-001');
    // The files travel as-is — the browser never reads the PEM bodies, so what matters is that
    // both parts arrive as file parts rather than as text. The mock server rebuilds each one as an
    // anonymous blob, so neither the name nor the body survives to be asserted on here.
    expect(typeof received?.get('certificate')).toBe('object');
    expect(typeof received?.get('private_key')).toBe('object');

    expect(await screen.findByText(/enviadas e validadas com sucesso/i)).toBeInTheDocument();
  });

  // An expired certificate is refused here rather than at the bank, with a charge in flight.
  it('reports the certificate rules the API enforces', async () => {
    server.use(
      http.post(apiUrl(`/api/v1/schools/${SCHOOL_ID}/bank_credentials`), () =>
        jsonError(422, 'validation_error', 'Dados inválidos', {
          certificate_pem: ['expirou'],
          private_key_pem: ['não corresponde ao certificado'],
        }),
      ),
    );

    renderPage();
    await fillForm();
    await user.click(screen.getByRole('button', { name: /enviar credenciais/i }));

    expect(await screen.findByText('Certificado: expirou')).toBeInTheDocument();
    expect(
      screen.getByText('Chave privada: não corresponde ao certificado'),
    ).toBeInTheDocument();
  });

  it('will not submit until both files and the client id are given', async () => {
    renderPage();

    const submit = await screen.findByRole('button', { name: /enviar credenciais/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/client id/i), 'client-stage-001');
    expect(submit).toBeDisabled();

    await user.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      pemFile('cora.pem'),
    );
    expect(submit).toBeDisabled();

    await user.upload(
      document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement,
      pemFile('cora.key'),
    );
    expect(submit).toBeEnabled();
  });

  it('keeps a non-backoffice user out', async () => {
    setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

    renderWithTheme(
      <MemoryRouter initialEntries={[credentialsPath]}>
        <AuthContext.Provider
          value={{ ...backofficeAuth, user: { ...backofficeUser, memberships: [] } }}
        >
          <Routes>
            <Route path="schools/:schoolId/bank-credentials" element={<BankCredentials />} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    const heading = await screen.findByText(/sem acesso a esta área/i);
    expect(heading).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enviar credenciais/i })).not.toBeInTheDocument();
  });
});
