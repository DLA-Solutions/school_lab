import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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

const user = userEvent.setup({ delay: null });

const activeCredential = {
  id: 901,
  school_id: SCHOOL_ID,
  instrument: 'service_invoice',
  provider: 'spedy',
  active: true,
  client_id: '',
  certificate_fingerprint: null,
  certificate_expires_at: null,
  uploaded_at: '2026-08-17T12:00:00Z',
  uploaded_by_id: 1,
};

const pfxFile = () =>
  new File(['pfx-bytes'], 'certificado.pfx', { type: 'application/x-pkcs12' });

const renderCard = () => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(<FiscalCredentialsCard schoolId={SCHOOL_ID} />);
};

beforeEach(() => {
  delete fiscalCredentialsBySchool[SCHOOL_ID];
});

describe('FiscalCredentialsCard', () => {
  it('says when Spedy is not configured yet', async () => {
    server.use(http.get(apiUrl(PATH), () => HttpResponse.json({ data: [] })));

    renderCard();

    expect(await screen.findByText(/não configurada/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /provisionar no spedy/i })).toBeInTheDocument();
  });

  it('provisions Spedy credentials', async () => {
    server.use(
      http.get(apiUrl(PATH), () =>
        HttpResponse.json({
          data: fiscalCredentialsBySchool[SCHOOL_ID] ?? [],
        }),
      ),
      http.post(apiUrl(PATH), () => {
        fiscalCredentialsBySchool[SCHOOL_ID] = [activeCredential];
        return HttpResponse.json({ data: activeCredential }, { status: 201 });
      }),
    );

    renderCard();
    await user.click(await screen.findByRole('button', { name: /provisionar no spedy/i }));

    expect(await screen.findByText(/escola provisionada no spedy/i)).toBeInTheDocument();
    expect(await screen.findByText('spedy')).toBeInTheDocument();
  });

  it('uploads the A1 certificate', async () => {
    let received: string | undefined;

    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json({ data: [activeCredential] })),
      http.post(apiUrl(`${PATH}/certificate`), async ({ request }) => {
        received = new TextDecoder('latin1').decode(await request.arrayBuffer());
        return HttpResponse.json({
          data: {
            ...activeCredential,
            certificate_fingerprint: 'SHA256:FISCAL:01',
          },
        });
      }),
    );

    renderCard();

    expect(await screen.findByText('spedy')).toBeInTheDocument();
    await user.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      pfxFile(),
    );
    await user.type(screen.getByLabelText(/senha do certificado/i), 'secret');
    await user.click(screen.getByRole('button', { name: /enviar certificado/i }));

    await waitFor(() => expect(received).toBeDefined());
    expect(received).toContain('name="certificate"');
    expect(received).toContain('name="password"');
    expect(await screen.findByText(/certificado enviado ao spedy/i)).toBeInTheDocument();
  });

  it('reports validation errors from the API', async () => {
    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json({ data: [activeCredential] })),
      http.post(apiUrl(`${PATH}/certificate`), () =>
        jsonError(422, 'validation_error', 'Dados inválidos', {
          password: ['em branco'],
        }),
      ),
    );

    renderCard();

    expect(await screen.findByText('spedy')).toBeInTheDocument();
    await user.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      pfxFile(),
    );
    await user.type(screen.getByLabelText(/senha do certificado/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /enviar certificado/i }));

    expect(await screen.findByText('password: em branco')).toBeInTheDocument();
  });
});
