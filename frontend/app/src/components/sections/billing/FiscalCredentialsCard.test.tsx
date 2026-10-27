import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  fiscalCredentialsBySchool,
  http,
  jsonError,
  server,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import FiscalCredentialsCard from './FiscalCredentialsCard';

const PATH = `/api/v1/schools/${SCHOOL_ID}/billing/fiscal_credentials`;
const DEFAULT_URL = 'https://api.spedy.com.br/v1';

const user = userEvent.setup({ delay: null });

const activeCredential = {
  id: 901,
  school_id: SCHOOL_ID,
  instrument: 'service_invoice',
  provider: 'spedy',
  active: true,
  client_id: '',
  base_url: DEFAULT_URL,
  certificate_fingerprint: null,
  certificate_expires_at: null,
  uploaded_at: '2026-08-17T12:00:00Z',
  uploaded_by_id: 1,
};

const renderCard = () => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(<FiscalCredentialsCard schoolId={SCHOOL_ID} />);
};

const tokenField = () => screen.getByLabelText(/token \(api key\) do spedy/i);
const baseUrlField = () => screen.getByLabelText(/url base da api do spedy/i);
const saveButton = () => screen.getByRole('button', { name: /salvar credenciais/i });

beforeEach(() => {
  delete fiscalCredentialsBySchool[SCHOOL_ID];
});

describe('FiscalCredentialsCard', () => {
  it('says when Spedy is not configured and offers only the key and base URL fields', async () => {
    server.use(http.get(apiUrl(PATH), () => HttpResponse.json({ data: [] })));

    renderCard();

    expect(await screen.findByText(/não configurada/i)).toBeInTheDocument();
    expect(tokenField()).toHaveAttribute('type', 'password');
    expect(baseUrlField()).toHaveValue('');
    expect(baseUrlField()).toHaveAttribute('placeholder', DEFAULT_URL);
    expect(screen.queryByRole('button', { name: /provisionar/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/senha do certificado/i)).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it('prefills the base URL from the active credential and never shows the token', async () => {
    server.use(
      http.get(apiUrl(PATH), () =>
        HttpResponse.json({
          data: [{ ...activeCredential, base_url: 'https://sandbox.spedy.example/v1' }],
        }),
      ),
    );

    renderCard();

    expect(await screen.findByText(/^ativa$/i)).toBeInTheDocument();
    expect(baseUrlField()).toHaveValue('https://sandbox.spedy.example/v1');
    expect(tokenField()).toHaveValue('');
    expect(screen.getByText(/substitui o token atual/i)).toBeInTheDocument();
  });

  it('keeps the save button disabled while the token is blank', async () => {
    server.use(http.get(apiUrl(PATH), () => HttpResponse.json({ data: [] })));

    renderCard();
    await screen.findByText(/não configurada/i);

    expect(saveButton()).toBeDisabled();

    await user.type(tokenField(), '   ');
    expect(saveButton()).toBeDisabled();

    await user.type(tokenField(), 'spedy-token');
    expect(saveButton()).toBeEnabled();
  });

  it('saves the key without base_url when blank, clears the token and reloads', async () => {
    let received: unknown;

    server.use(
      http.get(apiUrl(PATH), () =>
        HttpResponse.json({ data: fiscalCredentialsBySchool[SCHOOL_ID] ?? [] }),
      ),
      http.post(apiUrl(PATH), async ({ request }) => {
        received = await request.json();
        fiscalCredentialsBySchool[SCHOOL_ID] = [activeCredential];
        return HttpResponse.json({ data: activeCredential }, { status: 201 });
      }),
    );

    renderCard();
    await screen.findByText(/não configurada/i);
    await user.type(tokenField(), 'spedy-token');
    await user.click(saveButton());

    expect(await screen.findByText(/credenciais do spedy salvas/i)).toBeInTheDocument();
    expect(received).toEqual({ api_key: 'spedy-token' });
    expect(await screen.findByText(/^ativa$/i)).toBeInTheDocument();
    expect(tokenField()).toHaveValue('');
    expect(screen.queryByDisplayValue('spedy-token')).not.toBeInTheDocument();
    expect(baseUrlField()).toHaveValue(DEFAULT_URL);
  });

  it('sends the typed base URL trimmed', async () => {
    let received: unknown;

    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json({ data: [] })),
      http.post(apiUrl(PATH), async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ data: activeCredential }, { status: 201 });
      }),
    );

    renderCard();
    await screen.findByText(/não configurada/i);
    await user.type(tokenField(), 'spedy-token');
    await user.type(baseUrlField(), '  https://sandbox.spedy.example/v1 ');
    await user.click(saveButton());

    expect(await screen.findByText(/credenciais do spedy salvas/i)).toBeInTheDocument();
    expect(received).toEqual({
      api_key: 'spedy-token',
      base_url: 'https://sandbox.spedy.example/v1',
    });
  });

  it('shows the base_url validation error on the field', async () => {
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json({ data: [] })),
      http.post(apiUrl(PATH), () =>
        jsonError(422, 'validation_error', 'Dados inválidos', {
          base_url: ['não é uma URL válida'],
        }),
      ),
    );

    renderCard();
    await screen.findByText(/não configurada/i);
    await user.type(tokenField(), 'spedy-token');
    await user.type(baseUrlField(), 'not-a-url');
    await user.click(saveButton());

    expect(await screen.findByText('não é uma URL válida')).toBeInTheDocument();
    expect(baseUrlField()).toBeInvalid();
    expect(tokenField()).toHaveValue('spedy-token');
  });

  it('shows the provider message when Spedy rejects the key', async () => {
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json({ data: [] })),
      http.post(apiUrl(PATH), () =>
        jsonError(422, 'provider_error', 'Erro no provedor', {
          message: 'Token inválido no Spedy',
        }),
      ),
    );

    renderCard();
    await screen.findByText(/não configurada/i);
    await user.type(tokenField(), 'bad-token');
    await user.click(saveButton());

    expect(await screen.findByText('Token inválido no Spedy')).toBeInTheDocument();
  });
});
