import { HttpResponse, http } from 'msw';
import { AuthUser, Membership } from 'types/auth';
import { API_BASE_URL } from 'services/api';

/**
 * Default request handlers for the SPA test suite.
 *
 * They mirror the contract in `docs/api/README.md` and `docs/api/v1/fintech-first.md`:
 * REST under `/api/v1`, snake_case JSON, `{ data, meta }` on paginated lists,
 * `{ error: { code, message, details } }` on failures, school-scoped paths with the
 * guardian's own resources under `.../me/...`.
 *
 * A spec overrides one endpoint with `server.use(...)`; see
 * `docs/guidelines/web-ui/testing.md`.
 */

/** Built from the same constant the client uses, so a handler can never drift from the caller. */
export const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

/** The school every fixture belongs to. Any other `:school_id` gets the isolation 404. */
export const SCHOOL_ID = 42;

/** The token the protected handlers accept; `POST /auth/refresh` hands this one out. */
export const FRESH_ACCESS_TOKEN = 'fresh-access-token';

/** An expired token: protected handlers answer 401, which is what triggers the refresh. */
export const STALE_ACCESS_TOKEN = 'stale-access-token';

export const ACCESS_EXPIRES_AT = '2026-08-04T23:20:00Z';

export const VALID_CREDENTIALS = { email: 'maria@example.com', password: 'correct-horse' };

/** Guardian membership shape from GET /api/v1/me — staff-only fields are null or empty. */
export const guardianMembership: Membership = {
  id: 10,
  school_id: SCHOOL_ID,
  school_name: 'Example School — Downtown',
  role: 'guardian',
  status: 'active',
  email: VALID_CREDENTIALS.email,
  role_template: null,
  permissions: [],
  is_owner: null,
  segment_id: null,
  display_title: null,
  permission_sources: {},
};

/** Staff membership with permissions fields populated per GET /api/v1/me. */
export const staffMembership: Membership = {
  id: 11,
  school_id: SCHOOL_ID,
  school_name: 'Example School — Downtown',
  role: 'staff',
  status: 'active',
  email: 'admin@example.com',
  role_template: {
    id: 1,
    name: 'Secretária',
    system_key: 'secretary',
    is_system: true,
  },
  is_owner: false,
  segment_id: null,
  display_title: 'Secretária',
  permissions: ['manage_people'],
  permission_sources: { manage_people: 'template' },
};

export const currentUser: AuthUser = {
  id: 1,
  email: VALID_CREDENTIALS.email,
  status: 'active',
  memberships: [guardianMembership],
  guardian_profiles: [{ id: 5, school_id: SCHOOL_ID, name: 'Maria Silva' }],
};

export const staffUser: AuthUser = {
  id: 2,
  email: 'admin@example.com',
  status: 'active',
  memberships: [staffMembership],
  guardian_profiles: [],
};

/** Three rows so a `per_page` below the total actually slices. */
export const charges = [
  {
    id: 101,
    billing_period: '2026-08',
    total_amount: '850.00',
    due_date: '2026-08-10',
    status: 'pending',
    student: { id: 1, name: 'Pedro Silva' },
  },
  {
    id: 102,
    billing_period: '2026-07',
    total_amount: '850.00',
    due_date: '2026-07-10',
    status: 'overdue',
    student: { id: 1, name: 'Pedro Silva' },
  },
  {
    id: 103,
    billing_period: '2026-06',
    total_amount: '900.00',
    due_date: '2026-06-10',
    status: 'paid',
    student: { id: 2, name: 'Ana Silva' },
  },
];

/**
 * The API's error envelope. Reach for this in a spec override instead of hand-writing the
 * body, so every mocked failure has the shape `ApiError` unwraps.
 */
export const jsonError = (
  status: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {},
) => HttpResponse.json({ error: { code, message, details } }, { status });

/** Pagy-style envelope: `page` / `per_page` off the query string, `total` before slicing. */
export const paginated = <T>(rows: T[], url: URL) => {
  const page = Number(url.searchParams.get('page') ?? 1);
  const perPage = Number(url.searchParams.get('per_page') ?? 25);
  const offset = (page - 1) * perPage;

  return HttpResponse.json({
    data: rows.slice(offset, offset + perPage),
    meta: { page, per_page: perPage, total: rows.length },
  });
};

const hasFreshToken = (request: Request) =>
  request.headers.get('Authorization') === `Bearer ${FRESH_ACCESS_TOKEN}`;

const expiredToken = () => jsonError(401, 'unauthorized', 'Sessão expirada.');

export const handlers = [
  http.post(apiUrl('/api/v1/auth/login'), async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    if (body.email !== VALID_CREDENTIALS.email || body.password !== VALID_CREDENTIALS.password) {
      return jsonError(401, 'invalid_credentials', 'E-mail ou senha inválidos.');
    }

    return HttpResponse.json({
      access_token: FRESH_ACCESS_TOKEN,
      access_expires_at: ACCESS_EXPIRES_AT,
      user: currentUser,
    });
  }),

  // Succeeds by default so the transparent retry in `services/api.ts` has a happy path;
  // override it with a 401 to exercise a session that is really over.
  http.post(apiUrl('/api/v1/auth/refresh'), () =>
    HttpResponse.json({
      access_token: FRESH_ACCESS_TOKEN,
      access_expires_at: ACCESS_EXPIRES_AT,
    }),
  ),

  http.post(apiUrl('/api/v1/auth/logout'), () => new HttpResponse(null, { status: 204 })),

  http.get(apiUrl('/api/v1/me'), ({ request }) =>
    hasFreshToken(request) ? HttpResponse.json({ data: currentUser }) : expiredToken(),
  ),

  http.get(apiUrl('/api/v1/schools/:schoolId/me/charges'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    // Cross-tenant reads are a 404, never a 403 — the API does not confirm the row exists.
    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    return paginated(charges, new URL(request.url));
  }),
];
