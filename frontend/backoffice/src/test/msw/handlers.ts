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
  school_onboarding_status: 'active',
  school_onboarding_mode: 'white_glove',
};

export const SECRETARY_TEMPLATE_ID = 101;

export const roleTemplates = [
  {
    id: SECRETARY_TEMPLATE_ID,
    name: 'Secretária',
    system_key: 'secretary',
    is_system: true,
  },
  {
    id: 102,
    name: 'Direção',
    system_key: 'director',
    is_system: true,
  },
];

/** Invited staff on provisioning schools — mutated by POST memberships in tests. */
export const teamMembershipsBySchool: Record<number, Membership[]> = {};
/** Owner with pending_handoff — drives onboarding route guards in tests. */
export const ownerPendingMembership: Membership = {
  id: 12,
  school_id: SCHOOL_ID,
  school_name: 'Example School — Downtown',
  role: 'staff',
  status: 'active',
  email: 'director@example.com',
  role_template: {
    id: 2,
    name: 'Direção',
    system_key: 'director',
    is_system: true,
  },
  is_owner: true,
  segment_id: null,
  display_title: 'Diretor',
  permissions: ['manage_billing', 'manage_people'],
  permission_sources: {
    manage_billing: 'template',
    manage_people: 'template',
  },
  school_onboarding_status: 'pending_handoff',
  school_onboarding_mode: 'self_serve',
};

/** Invited staff membership — password not yet set via invite accept. */
export const invitedStaffMembership: Membership = {
  id: 13,
  school_id: SCHOOL_ID,
  school_name: 'Example School — Downtown',
  role: 'staff',
  status: 'invited',
  email: 'invitee@example.com',
  role_template: {
    id: 1,
    name: 'Secretária',
    system_key: 'secretary',
    is_system: true,
  },
  is_owner: false,
  segment_id: null,
  display_title: 'Secretária',
  permissions: [],
  permission_sources: {},
  school_onboarding_status: 'active',
  school_onboarding_mode: 'white_glove',
};

export const VALID_INVITE_TOKEN = 'valid-invite-token';
export const EXPIRED_INVITE_TOKEN = 'expired-invite-token';
export const INVITEE_EMAIL = 'invitee@example.com';
export const INVITEE_PASSWORD = 'invite-password-123';

export const invitedUser: AuthUser = {
  id: 3,
  email: INVITEE_EMAIL,
  status: 'active',
  memberships: [invitedStaffMembership],
  guardian_profiles: [],
};

export const ownerPendingUser: AuthUser = {
  id: 4,
  email: 'director@example.com',
  status: 'active',
  memberships: [ownerPendingMembership],
  guardian_profiles: [],
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

/** Platform backoffice operator — drives school create onboarding fields in tests. */
export const backofficeMembership: Membership = {
  id: 20,
  school_id: 0,
  school_name: null,
  role: 'backoffice',
  status: 'active',
  email: 'backoffice@example.com',
  role_template: null,
  permissions: [],
  is_owner: null,
  segment_id: null,
  display_title: null,
  permission_sources: {},
};

export const backofficeUser: AuthUser = {
  id: 5,
  email: 'backoffice@example.com',
  status: 'active',
  memberships: [backofficeMembership],
  guardian_profiles: [],
};

export const sampleSchools = [
  {
    id: 1,
    name: 'Escola Alpha',
    cnpj: '12.345.678/0001-90',
    address: 'Rua A, 100',
    saas_plan: 'standard',
    school_group_id: null,
    onboarding_status: 'active',
    onboarding_mode: 'self_serve',
  },
  {
    id: 2,
    name: 'Escola Beta',
    cnpj: null,
    address: null,
    saas_plan: null,
    school_group_id: null,
    onboarding_status: 'provisioning',
    onboarding_mode: 'white_glove',
  },
  {
    id: 3,
    name: 'Escola Gama',
    cnpj: null,
    address: null,
    saas_plan: null,
    school_group_id: null,
    onboarding_status: 'pending_handoff',
    onboarding_mode: 'white_glove',
  },
];

/** In-memory bank credential configs per school — mutated by POST in tests and default handlers. */
export const bankCredentialsBySchool: Record<
  number,
  Array<{
    id: number;
    school_id: number;
    instrument: string;
    provider: string;
    active: boolean;
    client_id: string;
    certificate_fingerprint: string;
    certificate_expires_at: string;
    uploaded_at: string;
    uploaded_by_id: number;
  }>
> = {};

const hasActiveBankCredentials = (schoolId: number) =>
  (bankCredentialsBySchool[schoolId] ?? []).some((config) => config.active);

export const sampleBankCredential = (schoolId: number, clientId: string, active = true) => ({
  id: 900 + schoolId,
  school_id: schoolId,
  instrument: 'bank_slip',
  provider: 'cora',
  active,
  client_id: clientId,
  certificate_fingerprint: 'SHA256:AB:CD:EF:12:34',
  certificate_expires_at: '2027-12-31T23:59:59Z',
  uploaded_at: '2026-08-10T12:00:00Z',
  uploaded_by_id: backofficeUser.id,
});

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

  http.post(apiUrl('/api/v1/auth/invite/accept'), async ({ request }) => {
    const body = (await request.json()) as { token?: string; password?: string; name?: string };

    if (body.token === EXPIRED_INVITE_TOKEN) {
      return jsonError(401, 'invalid_invite_token', 'Convite inválido ou expirado.');
    }

    if (body.token !== VALID_INVITE_TOKEN) {
      return jsonError(401, 'invalid_invite_token', 'Convite inválido ou expirado.');
    }

    if (!body.password || body.password.length < 8) {
      return jsonError(422, 'validation_error', 'Não foi possível salvar.', {
        password: ['is too short (minimum is 8 characters)'],
      });
    }

    if (!body.name?.trim()) {
      return jsonError(422, 'validation_error', 'Não foi possível salvar.', {
        name: ["can't be blank"],
      });
    }

    return HttpResponse.json({
      data: { user_id: invitedUser.id, membership_id: invitedStaffMembership.id },
    });
  }),

  http.post(apiUrl('/api/v1/me/memberships/:id/accept'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const membershipId = Number(params.id);

    if (membershipId === invitedStaffMembership.id) {
      return HttpResponse.json({
        data: { ...invitedStaffMembership, status: 'active' },
      });
    }

    return jsonError(404, 'not_found', 'Recurso não encontrado.');
  }),

  http.post(apiUrl('/api/v1/schools/:schoolId/people/memberships'), async ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const schoolId = Number(params.schoolId);
    const body = (await request.json()) as {
      membership?: {
        email?: string;
        role?: string;
        role_template_id?: number;
        display_title?: string;
      };
    };

    if (!body.membership?.email) {
      return jsonError(422, 'validation_error', 'Não foi possível salvar.', {
        email: ["can't be blank"],
      });
    }

    const template =
      roleTemplates.find((entry) => entry.id === body.membership?.role_template_id) ??
      roleTemplates[0];
    const membership: Membership = {
      id: 99 + (teamMembershipsBySchool[schoolId]?.length ?? 0),
      school_id: schoolId,
      school_name: sampleSchools.find((row) => row.id === schoolId)?.name ?? null,
      role: body.membership.role ?? 'staff',
      status: 'invited',
      email: body.membership.email,
      role_template: template,
      is_owner: false,
      segment_id: null,
      display_title: body.membership.display_title ?? template.name,
      permissions: [],
      permission_sources: {},
    };

    teamMembershipsBySchool[schoolId] = [...(teamMembershipsBySchool[schoolId] ?? []), membership];

    return HttpResponse.json(
      {
        data: {
          id: membership.id,
          status: membership.status,
          role: membership.role,
          display_title: membership.display_title,
        },
      },
      { status: 201 },
    );
  }),

  http.get(apiUrl('/api/v1/schools/:schoolId/people/memberships'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const schoolId = Number(params.schoolId);
    return paginated(teamMembershipsBySchool[schoolId] ?? [], new URL(request.url));
  }),

  http.post(apiUrl('/api/v1/schools/:schoolId/people/memberships/:id/invite'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    return new HttpResponse(null, { status: 202 });
  }),

  http.post(apiUrl('/api/v1/schools/:schoolId/handoff'), async ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const body = (await request.json()) as { handoff?: { billing_waived?: boolean } };
    const billingWaived = body.handoff?.billing_waived === true;
    const schoolId = Number(params.schoolId);
    const school = sampleSchools.find((row) => row.id === schoolId);
    const billingReady = billingWaived || hasActiveBankCredentials(schoolId);

    if (school?.onboarding_status === 'provisioning') {
      if (!billingReady) {
        return jsonError(422, 'validation_error', 'Checklist incompleta.', {
          checklist: ['billing'],
        });
      }

      return HttpResponse.json({
        data: {
          id: school.id,
          name: school.name,
          cnpj: school.cnpj,
          address: school.address,
          saas_plan: school.saas_plan,
          school_group_id: school.school_group_id,
          onboarding_status: 'pending_handoff',
          onboarding_mode: school.onboarding_mode,
          billing_waived_at: billingWaived ? '2026-08-10T12:00:00Z' : null,
          segments_skipped_at: null,
        },
      });
    }

    if (!billingReady) {
      return jsonError(422, 'validation_error', 'Checklist incompleta.', {
        checklist: ['billing'],
      });
    }

    return HttpResponse.json({
      data: {
        id: SCHOOL_ID,
        onboarding_status: 'active',
        onboarding_mode: 'self_serve',
        billing_waived_at: billingWaived ? '2026-08-10T12:00:00Z' : null,
        segments_skipped_at: null,
      },
    });
  }),

  http.get(apiUrl('/api/v1/schools/:schoolId/bank_credentials'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const schoolId = Number(params.schoolId);
    return HttpResponse.json({ data: bankCredentialsBySchool[schoolId] ?? [] });
  }),

  http.post(apiUrl('/api/v1/schools/:schoolId/bank_credentials'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const schoolId = Number(params.schoolId);
    const existing = bankCredentialsBySchool[schoolId] ?? [];
    const deactivated = existing.map((config) => ({ ...config, active: false }));
    const created = sampleBankCredential(schoolId, 'client-stage-001');
    bankCredentialsBySchool[schoolId] = [...deactivated, created];

    return HttpResponse.json({ data: created }, { status: 201 });
  }),

  http.get(apiUrl('/api/v1/schools/:schoolId'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const schoolId = Number(params.schoolId);
    const school = sampleSchools.find((row) => row.id === schoolId);

    if (!school) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    return HttpResponse.json({ data: school });
  }),

  http.post(apiUrl('/api/v1/schools/:schoolId/provisioning/import'), async ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const url = new URL(request.url);
    const dryRun = url.searchParams.get('dry_run') !== 'false';
    const formData = await request.formData();
    const file = formData.get('file');
    const fileName = file instanceof File ? file.name : '';

    if (!file) {
      return jsonError(422, 'import_validation_failed', 'Não foi possível processar o CSV.', {
        error_report: { file: ['Arquivo obrigatório.'] },
      });
    }

    if (fileName.includes('invalid')) {
      return jsonError(422, 'import_validation_failed', 'Não foi possível processar o CSV.', {
        error_report: {
          rows: [{ row: 2, errors: { student_name: ['não pode ficar em branco'] } }],
        },
      });
    }

    return HttpResponse.json({
      data: {
        import: {
          id: 501,
          status: dryRun ? 'previewed' : 'committed',
          row_count: 2,
          committed_at: dryRun ? null : '2026-08-10T12:00:00Z',
          created_at: '2026-08-10T12:00:00Z',
          error_report: null,
        },
        summary: {
          valid_rows: 2,
          students_to_create: 2,
          guardians_to_create: 2,
          links_to_create: 2,
        },
      },
    });
  }),

  http.get(apiUrl('/api/v1/schools/:schoolId/role_templates'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    return HttpResponse.json({
      data: roleTemplates,
      meta: { page: 1, per_page: 50, total: roleTemplates.length },
    });
  }),

  http.get(apiUrl('/api/v1/me'), ({ request }) =>
    hasFreshToken(request) ? HttpResponse.json({ data: currentUser }) : expiredToken(),
  ),

  http.get(apiUrl('/api/v1/schools'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const url = new URL(request.url);
    let rows = [...sampleSchools];

    const status = url.searchParams.get('onboarding_status');
    const mode = url.searchParams.get('onboarding_mode');

    if (status) {
      rows = rows.filter((school) => school.onboarding_status === status);
    }

    if (mode) {
      rows = rows.filter((school) => school.onboarding_mode === mode);
    }

    return paginated(rows, url);
  }),

  http.post(apiUrl('/api/v1/schools'), async ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const body = (await request.json()) as {
      school?: {
        name?: string;
        cnpj?: string;
        onboarding_mode?: string;
        owner_email?: string;
      };
    };

    if (!body.school?.name?.trim()) {
      return jsonError(422, 'validation_error', 'Não foi possível salvar.', {
        name: ["can't be blank"],
      });
    }

    if (!body.school.owner_email?.trim()) {
      return jsonError(422, 'validation_error', 'Não foi possível salvar.', {
        owner_email: ["can't be blank"],
      });
    }

    const onboardingMode = body.school.onboarding_mode === 'white_glove' ? 'white_glove' : 'self_serve';
    const onboardingStatus = onboardingMode === 'white_glove' ? 'provisioning' : 'pending_handoff';

    return HttpResponse.json(
      {
        data: {
          id: 99,
          name: body.school.name.trim(),
          cnpj: body.school.cnpj ?? null,
          address: null,
          saas_plan: null,
          school_group_id: null,
          onboarding_mode: onboardingMode,
          onboarding_status: onboardingStatus,
        },
      },
      { status: 201 },
    );
  }),

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
