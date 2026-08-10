import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ACCESS_EXPIRES_AT,
  FRESH_ACCESS_TOKEN,
  HttpResponse,
  SCHOOL_ID,
  STALE_ACCESS_TOKEN,
  VALID_CREDENTIALS,
  apiUrl,
  charges,
  currentUser,
  http,
  jsonError,
  server,
} from 'test/msw';
import { ApiError, request } from './api';
import { fetchCurrentUser, login, logout } from './authApi';
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStore';

const CHARGES_PATH = `/api/v1/schools/${SCHOOL_ID}/me/charges`;

/** Records every request MSW sees, so a spec can assert the retry actually replayed the call. */
const recordRequests = () => {
  const seen: string[] = [];

  server.events.on('request:start', ({ request }) => {
    seen.push(`${request.method} ${new URL(request.url).pathname}`);
  });

  return seen;
};

/** Records the `Accept-Language` MSW saw on each request, in the order they were sent. */
const recordAcceptLanguage = () => {
  const seen: { request: string; locale: string | null }[] = [];

  server.events.on('request:start', ({ request }) => {
    seen.push({
      request: `${request.method} ${new URL(request.url).pathname}`,
      locale: request.headers.get('Accept-Language'),
    });
  });

  return seen;
};

interface ChargesPage {
  data: typeof charges;
  meta: { page: number; per_page: number; total: number };
}

describe('services/api', () => {
  beforeEach(() => {
    clearAccessToken();
  });

  afterEach(() => {
    server.events.removeAllListeners();
    clearAccessToken();
  });

  it('sends the access token as a bearer and returns the parsed body', async () => {
    setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

    await expect(fetchCurrentUser()).resolves.toEqual(currentUser);
  });

  // `docs/api/README.md` → Locale: the API resolves its error messages against this tag.
  it('sends the product locale on an authenticated and on an anonymous call alike', async () => {
    const locales = recordAcceptLanguage();

    await login(VALID_CREDENTIALS);
    setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
    await fetchCurrentUser();

    expect(locales).toEqual([
      { request: 'POST /api/v1/auth/login', locale: 'en-US' },
      { request: 'GET /api/v1/me', locale: 'en-US' },
    ]);
  });

  it('sends the locale on the refresh and on the replayed request too', async () => {
    setAccessToken(STALE_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
    const locales = recordAcceptLanguage();

    await request<ChargesPage>(CHARGES_PATH);

    expect(locales).toEqual([
      { request: `GET ${CHARGES_PATH}`, locale: 'en-US' },
      { request: 'POST /api/v1/auth/refresh', locale: 'en-US' },
      { request: `GET ${CHARGES_PATH}`, locale: 'en-US' },
    ]);
  });

  it('returns the data and meta of a paginated list', async () => {
    setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

    const page = await request<ChargesPage>(`${CHARGES_PATH}?page=2&per_page=2`);

    expect(page.data).toEqual([charges[2]]);
    expect(page.meta).toEqual({ page: 2, per_page: 2, total: charges.length });
  });

  it('raises the error envelope as an ApiError', async () => {
    setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
    server.use(
      http.get(apiUrl(CHARGES_PATH), () =>
        jsonError(422, 'validation_error', 'Não foi possível salvar.', {
          due_date: ['must be in the future'],
        }),
      ),
    );

    const error = await request(CHARGES_PATH).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: 'validation_error',
      message: 'Não foi possível salvar.',
      details: { due_date: ['must be in the future'] },
    });
  });

  it('refreshes the access token and replays the request once on a 401', async () => {
    setAccessToken(STALE_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
    const seen = recordRequests();

    const page = await request<ChargesPage>(CHARGES_PATH);

    expect(page.meta.total).toBe(charges.length);
    expect(seen).toEqual([
      `GET ${CHARGES_PATH}`,
      'POST /api/v1/auth/refresh',
      `GET ${CHARGES_PATH}`,
    ]);
    expect(getAccessToken()).toBe(FRESH_ACCESS_TOKEN);
  });

  it('gives up and clears the session when the refresh itself is rejected', async () => {
    setAccessToken(STALE_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
    server.use(
      http.post(apiUrl('/api/v1/auth/refresh'), () =>
        jsonError(401, 'invalid_refresh_token', 'Sessão encerrada.'),
      ),
    );

    await expect(request(CHARGES_PATH)).rejects.toMatchObject({ status: 401 });
    expect(getAccessToken()).toBeNull();
  });

  it('does not attempt a refresh when the caller opted out', async () => {
    setAccessToken(STALE_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
    const seen = recordRequests();

    await expect(fetchCurrentUser()).rejects.toMatchObject({ status: 401 });
    expect(seen).toEqual(['GET /api/v1/me']);
  });

  it('reads a 204 as an empty body', async () => {
    setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

    await expect(logout()).resolves.toBeNull();
  });

  it('stores nothing when the credentials are rejected', async () => {
    await expect(login({ email: 'maria@example.com', password: 'wrong' })).rejects.toMatchObject({
      status: 401,
      code: 'invalid_credentials',
    });
    expect(getAccessToken()).toBeNull();
  });

  it('lets a spec override a single endpoint without touching the others', async () => {
    setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
    server.use(http.get(apiUrl('/api/v1/me'), () => HttpResponse.json({ data: null })));

    await expect(fetchCurrentUser()).resolves.toBeNull();
    // The default charges handler is untouched by the override above.
    await expect(request<ChargesPage>(CHARGES_PATH)).resolves.toMatchObject({
      meta: { total: charges.length },
    });
  });

  it('answers a cross-school read with the isolation 404', async () => {
    setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

    await expect(request('/api/v1/schools/99/me/charges')).rejects.toMatchObject({
      status: 404,
      code: 'not_found',
    });
  });
});
