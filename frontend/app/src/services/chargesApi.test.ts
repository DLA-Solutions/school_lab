import { beforeEach, describe, expect, it } from 'vitest';
import {
  ACCESS_EXPIRES_AT,
  FRESH_ACCESS_TOKEN,
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  http,
  jsonError,
  server,
} from 'test/msw';
import { ApiError } from './api';
import { fetchChargeBoletoPdf } from './chargesApi';
import { clearAccessToken, setAccessToken } from './tokenStore';

describe('services/chargesApi fetchChargeBoletoPdf', () => {
  const path = (id: number) => `/api/v1/schools/${SCHOOL_ID}/billing/charges/${id}/boleto_pdf`;

  beforeEach(() => {
    clearAccessToken();
    setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
  });

  it('returns the PDF as a blob, sending the bearer token', async () => {
    let authorization: string | null = null;
    server.use(
      http.get(apiUrl(path(55)), ({ request }) => {
        authorization = request.headers.get('Authorization');

        return new HttpResponse('%PDF-1.4', { headers: { 'Content-Type': 'application/pdf' } });
      }),
    );

    const blob = await fetchChargeBoletoPdf(SCHOOL_ID, 55);

    expect(await blob.text()).toBe('%PDF-1.4');
    expect(authorization).toBe(`Bearer ${FRESH_ACCESS_TOKEN}`);
  });

  it.each([
    [409, 'boleto_pdf_unavailable'],
    [502, 'boleto_pdf_provider_error'],
    [503, 'boleto_pdf_provider_unavailable'],
    [404, 'not_found'],
  ])('throws an ApiError carrying the %i error code', async (status, code) => {
    server.use(http.get(apiUrl(path(55)), () => jsonError(status, code, 'mensagem')));

    const failure = await fetchChargeBoletoPdf(SCHOOL_ID, 55).catch((err: unknown) => err);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status, code, message: 'mensagem' });
  });
});
