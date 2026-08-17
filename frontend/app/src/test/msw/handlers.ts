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

export const SECRETARY_TEMPLATE_ID = 101;
export const DIRECTOR_TEMPLATE_ID = 102;

/** All MVP module keys enabled — matches schools seeded via POST /schools. */
export const ALL_ENABLED_MODULES = ['communication', 'academic', 'billing', 'documents'] as const;

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
  enabled_modules: [...ALL_ENABLED_MODULES],
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
    id: SECRETARY_TEMPLATE_ID,
    name: 'Secretária',
    system_key: 'secretary',
    is_system: true,
  },
  is_owner: false,
  segment_id: null,
  display_title: 'Secretária',
  permissions: ['manage_people'],
  permission_sources: { manage_people: 'template' },
  enabled_modules: [...ALL_ENABLED_MODULES],
  school_onboarding_status: 'active',
  school_onboarding_mode: 'white_glove',
};

export const roleTemplates = [
  {
    id: SECRETARY_TEMPLATE_ID,
    name: 'Secretária',
    system_key: 'secretary',
    is_system: true,
    permissions: [
      { permission_key: 'manage_people', scope_kind: 'full' },
      { permission_key: 'manage_enrollment', scope_kind: 'full' },
      { permission_key: 'manage_documents', scope_kind: 'full' },
    ],
  },
  {
    id: DIRECTOR_TEMPLATE_ID,
    name: 'Direção',
    system_key: 'director',
    is_system: true,
    permissions: [
      { permission_key: 'manage_school_settings', scope_kind: 'full' },
      { permission_key: 'manage_billing', scope_kind: 'full' },
      { permission_key: 'manage_people', scope_kind: 'full' },
      { permission_key: 'manage_enrollment', scope_kind: 'full' },
      { permission_key: 'manage_documents', scope_kind: 'full' },
      { permission_key: 'approve_lesson_plans', scope_kind: 'full' },
      { permission_key: 'moderate_messages', scope_kind: 'full' },
      { permission_key: 'view_billing_summary', scope_kind: 'full' },
    ],
  },
];

export const permissionDefinitions = [
  { key: 'manage_school_settings', domain: 'school', scope_kinds: ['full'] },
  { key: 'manage_billing', domain: 'billing', scope_kinds: ['full'] },
  { key: 'manage_people', domain: 'people', scope_kinds: ['full', 'partial'] },
  { key: 'manage_enrollment', domain: 'enrollment', scope_kinds: ['full'] },
  { key: 'manage_documents', domain: 'documents', scope_kinds: ['full', 'segment'] },
  { key: 'approve_lesson_plans', domain: 'academic', scope_kinds: ['full'] },
  { key: 'moderate_messages', domain: 'communication', scope_kinds: ['full'] },
  { key: 'teach', domain: 'academic', scope_kinds: ['full'] },
  { key: 'view_billing_summary', domain: 'billing', scope_kinds: ['full'] },
];

/** Owner with pending_handoff — drives onboarding route guards in tests. */
export const ownerPendingMembership: Membership = {
  id: 12,
  school_id: SCHOOL_ID,
  school_name: 'Example School — Downtown',
  role: 'staff',
  status: 'active',
  email: 'director@example.com',
  role_template: {
    id: DIRECTOR_TEMPLATE_ID,
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

/** Mutable copy so PATCH /permissions specs can assert refreshed state. */
export const teamMemberships: Membership[] = [
  {
    ...ownerPendingMembership,
    school_onboarding_status: 'active',
    permissions: ['manage_billing', 'manage_people', 'manage_enrollment', 'manage_documents'],
    permission_sources: {
      manage_billing: 'owner',
      manage_people: 'owner',
      manage_enrollment: 'owner',
      manage_documents: 'owner',
    },
  },
  {
    ...staffMembership,
    permissions: ['manage_people', 'manage_enrollment', 'manage_documents'],
    permission_sources: {
      manage_people: 'template',
      manage_enrollment: 'template',
      manage_documents: 'template',
    },
  },
  {
    id: 14,
    school_id: SCHOOL_ID,
    school_name: 'Example School — Downtown',
    role: 'guardian',
    status: 'active',
    email: 'guardian@example.com',
    role_template: null,
    permissions: [],
    is_owner: null,
    segment_id: null,
    display_title: null,
    permission_sources: {},
  },
];

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
];

/** Guardian open charges — mirrors `ChargeBlueprint` `:guardian` view. */
export const myOpenCharges = [
  {
    id: 101,
    billing_period: '2026-08',
    total_amount_cents: 85_000,
    due_date: '2026-08-10',
    status: 'pending',
    kind: 'tuition',
    description: null,
    contract_id: 1,
    student: { id: 1, name: 'Pedro Silva' },
    interest_rate_percent: 1.0,
    payment_methods: {
      boleto_url: 'https://provider.example/boleto/101.pdf',
      pix_copy_paste: '00020126580014br.gov.bcb.pix101',
    },
  },
  {
    id: 102,
    billing_period: '2026-07',
    total_amount_cents: 85_000,
    due_date: '2026-07-10',
    status: 'overdue',
    kind: 'tuition',
    description: null,
    contract_id: 1,
    student: { id: 1, name: 'Pedro Silva' },
    interest_rate_percent: 1.0,
    payment_methods: {
      boleto_url: 'https://provider.example/boleto/102.pdf',
      pix_copy_paste: '00020126580014br.gov.bcb.pix102',
    },
  },
  {
    id: 104,
    billing_period: '2026-08',
    total_amount_cents: 90_000,
    due_date: '2026-08-12',
    status: 'pending',
    kind: 'tuition',
    description: null,
    contract_id: 2,
    student: { id: 2, name: 'Ana Silva' },
    interest_rate_percent: 1.0,
    payment_methods: {
      boleto_url: 'https://provider.example/boleto/104.pdf',
      pix_copy_paste: '00020126580014br.gov.bcb.pix104',
    },
  },
];

/** Guardian paid history — mirrors `ChargeBlueprint` `:guardian_history` view. */
export const myChargeHistory = [
  {
    id: 88,
    billing_period: '2025-12',
    total_amount_cents: 80_000,
    status: 'paid',
    kind: 'tuition',
    description: null,
    contract_id: 1,
    student: { id: 1, name: 'Pedro Silva' },
    paid_at: '2025-12-08T14:30:00Z',
    source: 'platform',
    interest_rate_percent: 1.0,
  },
];

export const fiscalSettingsFixture = {
  id: 1,
  enabled: false,
  issuance_city_name: 'Goiânia',
  issuance_state: 'GO',
  spedy_city_code: 5_208_707,
  federal_service_code: '8.01',
  cnae_code: '8513900',
  city_service_code: null,
  nbs_code: null,
  national_taxation_code: null,
  iss_rate_percent: 5.0,
  service_description: 'Mensalidade escolar',
  taxation_type: 'taxationInMunicipality',
  tax_location: 'companyMunicipality',
  issue_type: null,
  reform_tributaria_enabled: false,
  provider_options_snapshot: {},
  ibs_cbs_config: {},
};

export const supportedCitiesFixture = [
  {
    code: 5_208_707,
    name: 'Goiânia',
    state: 'GO',
    provider: 'ISSNet',
    provider_options: { requiredFields: ['city_service_code'] },
  },
  {
    code: 3_550_308,
    name: 'São Paulo',
    state: 'SP',
    provider: 'Ginfes',
    provider_options: {},
  },
];

export const fiscalCredentialsBySchool: Record<number, unknown[]> = {};

export const serviceInvoicesFixture = [
  {
    id: 501,
    status: 'authorized',
    integration_id: 'pay-9001',
    provider: 'fake',
    provider_document_id: 'fake-si-001',
    invoice_number: '12345',
    verification_code: 'ABCD1234',
    access_key: null,
    payment_id: 9001,
    charge_id: 88,
    authorized_at: '2025-12-08T15:00:00Z',
    enqueued_at: '2025-12-08T14:35:00Z',
    failed_at: null,
    pdf_available: true,
  },
  {
    id: 502,
    status: 'enqueued',
    integration_id: 'pay-9002',
    provider: 'fake',
    provider_document_id: 'fake-si-002',
    invoice_number: null,
    verification_code: null,
    access_key: null,
    payment_id: 9002,
    charge_id: 101,
    authorized_at: null,
    enqueued_at: '2026-08-17T10:00:00Z',
    failed_at: null,
    pdf_available: false,
  },
];

/** Default open-charges list used by `api.test.ts`. */
export const charges = myOpenCharges;

export const reportCardConfig = {
  id: 1,
  version: 1,
  template_key: 'standard_v1',
  display_config: { hide_discipline_ids: [] },
  header_text: 'Boletim escolar',
  footer_text: 'Documento sem valor legal',
  document_signatory_id: 7,
  signatory: {
    id: 7,
    role_label: 'Secretaria',
    name: 'Maria Silva',
    title: 'Secretária Escolar',
  },
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-01T10:00:00Z',
};

export const myReportCards = [
  {
    publication_id: 801,
    student_id: 1,
    academic_period_id: 44,
    snapshot_id: 901,
    version: 1,
    released_at: '2026-08-17T11:00:00Z',
    pdf_url: `/api/v1/schools/${SCHOOL_ID}/me/report_cards/801/snapshots/901/pdf`,
  },
  {
    publication_id: 802,
    student_id: 2,
    academic_period_id: 44,
    snapshot_id: 902,
    version: 1,
    released_at: '2026-08-17T11:00:00Z',
    pdf_url: `/api/v1/schools/${SCHOOL_ID}/me/report_cards/802/snapshots/902/pdf`,
  },
];

export const myReportCardPublication = {
  id: 801,
  student_id: 1,
  academic_period_id: 44,
  active_snapshot_id: 901,
  active_snapshot: {
    id: 901,
    version: 1,
    released_at: '2026-08-17T11:00:00Z',
    correction_reason: null,
    grade_launch_digest: 'abc123',
    supersedes_id: null,
    snapshot: {
      disciplines: [{ name: 'Matemática', grade: '8.5' }],
      attendance: { percentage: '95.00' },
    },
    config_version: 1,
    pdf_url: `/api/v1/schools/${SCHOOL_ID}/me/report_cards/801/snapshots/901/pdf`,
  },
  created_at: '2026-08-17T11:00:00Z',
  updated_at: '2026-08-17T11:00:00Z',
};

export const myTaxDeclarations = [
  {
    tax_declaration_id: 81,
    calendar_year: 2025,
    active_version_id: 94,
    version: {
      id: 94,
      number: 2,
      lifecycle: 'active' as const,
      supersedes_version_id: 88,
      total_declared_principal_amount_cents: 2_450_000,
      issued_at: '2026-01-08T14:00:00Z',
      students: [
        {
          student_id: 1,
          student_name: 'Pedro Silva',
          declared_principal_amount_cents: 1_200_000,
        },
        {
          student_id: 2,
          student_name: 'Ana Silva',
          declared_principal_amount_cents: 1_250_000,
        },
      ],
      pdf_url: `/api/v1/schools/${SCHOOL_ID}/me/tax_declarations/81/versions/94/pdf`,
    },
  },
];

export const myTaxDeclarationVersion = myTaxDeclarations[0].version;

export const schoolClassesFixture = [
  {
    id: 310,
    school_id: SCHOOL_ID,
    name: 'A',
    grade_level: '6º ano',
    shift: 'matutino',
    year: 2026,
    student_count: 2,
    subjects: [{ id: 1, school_id: SCHOOL_ID, name: 'Matemática' }],
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
      const updated = { ...invitedStaffMembership, status: 'active' as const };
      currentUser.memberships = currentUser.memberships.map((membership) =>
        membership.id === membershipId ? updated : membership,
      );

      return HttpResponse.json({ data: updated });
    }

    return jsonError(404, 'not_found', 'Recurso não encontrado.');
  }),

  http.post(apiUrl('/api/v1/schools/:schoolId/people/memberships'), async ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const body = (await request.json()) as {
      membership?: { email?: string; role?: string; role_template_id?: number };
    };

    if (!body.membership?.email) {
      return jsonError(422, 'validation_error', 'Não foi possível salvar.', {
        email: ["can't be blank"],
      });
    }

    return HttpResponse.json(
      {
        data: {
          id: 99,
          status: 'invited',
          role: body.membership.role ?? 'staff',
          display_title: 'Secretária',
        },
      },
      { status: 201 },
    );
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

    if (school?.onboarding_status === 'provisioning') {
      if (!billingWaived) {
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
          billing_waived_at: '2026-08-10T12:00:00Z',
          segments_skipped_at: null,
        },
      });
    }

    if (!billingWaived) {
      return jsonError(422, 'validation_error', 'Checklist incompleta.', {
        checklist: ['billing'],
      });
    }

    return HttpResponse.json({
      data: {
        id: SCHOOL_ID,
        onboarding_status: 'active',
        onboarding_mode: 'self_serve',
        billing_waived_at: '2026-08-10T12:00:00Z',
        segments_skipped_at: null,
      },
    });
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

  http.get(apiUrl('/api/v1/schools/:schoolId/permission_definitions'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    return HttpResponse.json({ data: { definitions: permissionDefinitions } });
  }),

  http.get(apiUrl('/api/v1/schools/:schoolId/people/memberships'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    return paginated(teamMemberships, new URL(request.url));
  }),

  http.patch(
    apiUrl('/api/v1/schools/:schoolId/people/memberships/:id/permissions'),
    async ({ request, params }) => {
      if (!hasFreshToken(request)) {
        return expiredToken();
      }

      const membershipId = Number(params.id);
      const index = teamMemberships.findIndex((row) => row.id === membershipId);

      if (index === -1) {
        return jsonError(404, 'not_found', 'Recurso não encontrado.');
      }

      const body = (await request.json()) as { grants?: string[]; denies?: string[] };
      const grants = body.grants ?? [];
      const denies = body.denies ?? [];
      const overlap = grants.find((key) => denies.includes(key));

      if (overlap) {
        return jsonError(422, 'validation_error', 'Não foi possível salvar.', {
          grants: ['overlap with denies'],
        });
      }

      if (grants.includes('teach') && teamMemberships[index].role === 'staff') {
        return jsonError(422, 'invalid_permission_for_role', 'Permissão inválida para o papel.');
      }

      if (teamMemberships[index].status === 'suspended') {
        return jsonError(409, 'invalid_state_transition', 'Situação inválida.');
      }

      const current = teamMemberships[index];
      const template =
        roleTemplates.find((entry) => entry.id === current.role_template?.id) ?? roleTemplates[0];
      const templateKeys = template.permissions.map((entry) => entry.permission_key);
      const effective = [
        ...templateKeys.filter((key) => !denies.includes(key)),
        ...grants.filter((key) => !templateKeys.includes(key)),
      ];
      const sources: Record<string, string> = {};

      templateKeys.forEach((key) => {
        if (!denies.includes(key)) {
          sources[key] = 'template';
        }
      });
      grants.forEach((key) => {
        sources[key] = 'grant';
      });

      const updated = {
        ...current,
        permissions: [...new Set(effective)].sort(),
        permission_sources: sources,
      };

      teamMemberships[index] = updated;

      return HttpResponse.json({ data: updated });
    },
  ),

  http.get(apiUrl('/api/v1/me'), ({ request }) =>
    hasFreshToken(request) ? HttpResponse.json({ data: currentUser }) : expiredToken(),
  ),

  http.get(apiUrl('/api/v1/schools'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    return paginated(sampleSchools, new URL(request.url));
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

    const url = new URL(request.url);
    const studentId = url.searchParams.get('student_id');
    let rows = myOpenCharges;

    if (studentId) {
      const linkedStudentIds = new Set(
        [...myOpenCharges, ...myChargeHistory].map((row) => row.student?.id).filter(Boolean),
      );
      // The API 404s when the filter names a child this guardian is not linked to.
      if (!linkedStudentIds.has(Number(studentId))) {
        return jsonError(404, 'not_found', 'Recurso não encontrado.');
      }

      rows = rows.filter((row) => row.student?.id === Number(studentId));
    }

    return paginated(rows, url);
  }),

  http.get(apiUrl('/api/v1/schools/:schoolId/me/charges/history'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const url = new URL(request.url);
    const studentId = url.searchParams.get('student_id');
    let rows = myChargeHistory;

    if (studentId) {
      rows = rows.filter((row) => row.student?.id === Number(studentId));
    }

    return paginated(rows, url);
  }),

  http.get(apiUrl('/api/v1/schools/:schoolId/me/charges/:id'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const charge = myOpenCharges.find((row) => row.id === Number(params.id));
    if (!charge) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    return HttpResponse.json({ data: charge });
  }),

  http.post(apiUrl('/api/v1/schools/:schoolId/me/charges/:id/reissue'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const charge = myOpenCharges.find((row) => row.id === Number(params.id));
    if (!charge) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const updated = {
      ...charge,
      payment_methods: {
        boleto_url: `${charge.payment_methods.boleto_url}?reissued=1`,
        pix_copy_paste: `${charge.payment_methods.pix_copy_paste}-reissued`,
      },
    };

    return HttpResponse.json({ data: updated });
  }),

  http.get(apiUrl('/api/v1/schools/:schoolId/me/students'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const students = [
      { id: 1, name: 'Pedro Silva' },
      { id: 2, name: 'Ana Silva' },
    ];

    return paginated(students, new URL(request.url));
  }),

  http.get(apiUrl('/api/v1/schools/:schoolId/me/report_cards'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const url = new URL(request.url);
    const studentId = url.searchParams.get('student_id');
    let rows = myReportCards;

    if (studentId) {
      const linkedStudentIds = new Set(myReportCards.map((row) => row.student_id));
      if (!linkedStudentIds.has(Number(studentId))) {
        return jsonError(404, 'not_found', 'Recurso não encontrado.');
      }

      rows = rows.filter((row) => row.student_id === Number(studentId));
    }

    return paginated(rows, url);
  }),

  http.get(apiUrl('/api/v1/schools/:schoolId/me/report_cards/:publicationId'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    if (params.publicationId !== '801') {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    return HttpResponse.json({ data: myReportCardPublication });
  }),

  http.get(
    apiUrl('/api/v1/schools/:schoolId/me/report_cards/:publicationId/snapshots/:snapshotId/pdf'),
    ({ request, params }) => {
      if (!hasFreshToken(request)) {
        return expiredToken();
      }

      if (params.schoolId !== String(SCHOOL_ID) || params.publicationId !== '801') {
        return jsonError(404, 'not_found', 'Recurso não encontrado.');
      }

      return new HttpResponse('%PDF-1.4 test', {
        headers: { 'Content-Type': 'application/pdf' },
      });
    },
  ),

  http.get(apiUrl('/api/v1/schools/:schoolId/me/tax_declarations'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    return paginated(myTaxDeclarations, new URL(request.url));
  }),

  http.post(apiUrl('/api/v1/schools/:schoolId/me/tax_declarations'), async ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const body = (await request.json()) as {
      tax_declaration?: { calendar_year?: number };
    };
    const calendarYear = body.tax_declaration?.calendar_year;

    if (calendarYear === 2024) {
      return jsonError(
        422,
        'no_eligible_payments',
        'Não há pagamentos elegíveis para este ano.',
      );
    }

    if (calendarYear === 2023) {
      return jsonError(
        422,
        'tax_declaration_configuration_incomplete',
        'A configuração da declaração ainda não está completa.',
      );
    }

    if (calendarYear === 2026) {
      return jsonError(422, 'calendar_year_not_closed', 'O ano-calendário ainda não encerrou.');
    }

    const existing = myTaxDeclarations.find((row) => row.calendar_year === calendarYear);
    const payload = existing ?? myTaxDeclarations[0];

    return HttpResponse.json(
      {
        data: {
          tax_declaration_id: payload.tax_declaration_id,
          calendar_year: calendarYear ?? payload.calendar_year,
          active_version_id: payload.active_version_id,
          version: payload.version,
        },
      },
      { status: existing ? 200 : 201 },
    );
  }),

  http.get(
    apiUrl('/api/v1/schools/:schoolId/me/tax_declarations/:taxDeclarationId'),
    ({ request, params }) => {
      if (!hasFreshToken(request)) {
        return expiredToken();
      }

      if (params.schoolId !== String(SCHOOL_ID)) {
        return jsonError(404, 'not_found', 'Recurso não encontrado.');
      }

      const row = myTaxDeclarations.find(
        (item) => item.tax_declaration_id === Number(params.taxDeclarationId),
      );

      if (!row) {
        return jsonError(404, 'not_found', 'Recurso não encontrado.');
      }

      return HttpResponse.json({ data: row });
    },
  ),

  http.get(
    apiUrl('/api/v1/schools/:schoolId/me/tax_declarations/:taxDeclarationId/versions/:versionId'),
    ({ request, params }) => {
      if (!hasFreshToken(request)) {
        return expiredToken();
      }

      if (params.schoolId !== String(SCHOOL_ID) || params.taxDeclarationId !== '81') {
        return jsonError(404, 'not_found', 'Recurso não encontrado.');
      }

      if (params.versionId !== '94') {
        return jsonError(404, 'not_found', 'Recurso não encontrado.');
      }

      return HttpResponse.json({ data: myTaxDeclarationVersion });
    },
  ),

  http.get(
    apiUrl(
      '/api/v1/schools/:schoolId/me/tax_declarations/:taxDeclarationId/versions/:versionId/pdf',
    ),
    ({ request, params }) => {
      if (!hasFreshToken(request)) {
        return expiredToken();
      }

      if (params.schoolId !== String(SCHOOL_ID) || params.taxDeclarationId !== '81') {
        return jsonError(404, 'not_found', 'Recurso não encontrado.');
      }

      return new HttpResponse('%PDF-1.4 tax-declaration', {
        headers: { 'Content-Type': 'application/pdf' },
      });
    },
  ),

  http.get(apiUrl('/api/v1/schools/:schoolId/academics/report_card_config'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    return HttpResponse.json({ data: reportCardConfig });
  }),

  http.patch(apiUrl('/api/v1/schools/:schoolId/academics/report_card_config'), async ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const body = (await request.json()) as { report_card_config?: Partial<typeof reportCardConfig> };
    const next = {
      ...reportCardConfig,
      ...body.report_card_config,
      version: reportCardConfig.version + 1,
    };

    return HttpResponse.json({ data: next });
  }),

  http.get(apiUrl('/api/v1/schools/:schoolId/academics/school_classes'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    return paginated(schoolClassesFixture, new URL(request.url));
  }),

  http.post(
    apiUrl('/api/v1/schools/:schoolId/academics/report_card_publication_batches/validate'),
    async ({ request, params }) => {
      if (!hasFreshToken(request)) {
        return expiredToken();
      }

      if (params.schoolId !== String(SCHOOL_ID)) {
        return jsonError(404, 'not_found', 'Recurso não encontrado.');
      }

      const body = (await request.json()) as {
        report_card_publication_batch?: { class_id?: number; academic_period_id?: number };
      };
      const classId = body.report_card_publication_batch?.class_id;
      const periodId = body.report_card_publication_batch?.academic_period_id;

      if (classId === 310 && periodId === 44) {
        return HttpResponse.json({
          data: {
            class_id: classId,
            academic_period_id: periodId,
            ready: true,
            blockers: [],
          },
        });
      }

      return jsonError(422, 'report_card_not_ready', 'Boletim ainda não está pronto.', {
        blockers: [{ student_id: 1, code: 'grade_launch_missing', details: {} }],
      });
    },
  ),

  http.post(
    apiUrl('/api/v1/schools/:schoolId/academics/report_card_publication_batches'),
    async ({ request, params }) => {
      if (!hasFreshToken(request)) {
        return expiredToken();
      }

      if (params.schoolId !== String(SCHOOL_ID)) {
        return jsonError(404, 'not_found', 'Recurso não encontrado.');
      }

      const body = (await request.json()) as {
        report_card_publication_batch?: { class_id?: number; academic_period_id?: number };
      };
      const classId = body.report_card_publication_batch?.class_id;
      const periodId = body.report_card_publication_batch?.academic_period_id;

      if (classId !== 310 || periodId !== 44) {
        return jsonError(422, 'report_card_not_ready', 'Boletim ainda não está pronto.', {
          blockers: [{ student_id: 1, code: 'grade_launch_missing', details: {} }],
        });
      }

      return HttpResponse.json(
        {
          data: {
            batch_id: 501,
            schedule_id: null,
            status: 'completed',
            atomic: true,
            class_id: classId,
            academic_period_id: periodId,
            scheduled_for: null,
            counts: { requested: 2, released: 2, failed: 0 },
            results: myReportCards.map((row) => ({
              student_id: row.student_id,
              publication_id: row.publication_id,
              snapshot_id: row.snapshot_id,
              version: row.version,
              released_at: row.released_at,
              pdf_url: row.pdf_url,
            })),
            blockers: [],
          },
        },
        { status: 201 },
      );
    },
  ),

  http.post(
    apiUrl('/api/v1/schools/:schoolId/academics/report_card_publications/:publicationId/republish'),
    async ({ request, params }) => {
      if (!hasFreshToken(request)) {
        return expiredToken();
      }

      if (params.schoolId !== String(SCHOOL_ID)) {
        return jsonError(404, 'not_found', 'Recurso não encontrado.');
      }

      const body = (await request.json()) as {
        report_card_publication?: { correction_reason?: string };
      };

      if (!body.report_card_publication?.correction_reason?.trim()) {
        return jsonError(422, 'republish_reason_required', 'Informe o motivo da correção.');
      }

      return HttpResponse.json(
        {
          data: {
            publication_id: Number(params.publicationId),
            snapshot_id: 903,
            version: 2,
            released_at: '2026-08-18T11:00:00Z',
            pdf_url: `/api/v1/schools/${SCHOOL_ID}/me/report_cards/${params.publicationId}/snapshots/903/pdf`,
          },
        },
        { status: 201 },
      );
    },
  ),

  http.get(apiUrl('/api/v1/schools/:schoolId/billing/fiscal_settings'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    return HttpResponse.json({ data: fiscalSettingsFixture });
  }),

  http.patch(apiUrl('/api/v1/schools/:schoolId/billing/fiscal_settings'), async ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const body = (await request.json()) as { fiscal_settings?: Record<string, unknown> };

    return HttpResponse.json({
      data: {
        ...fiscalSettingsFixture,
        ...body.fiscal_settings,
      },
    });
  }),

  http.get(
    apiUrl('/api/v1/schools/:schoolId/billing/fiscal/supported_cities'),
    ({ request, params }) => {
      if (!hasFreshToken(request)) {
        return expiredToken();
      }

      if (params.schoolId !== String(SCHOOL_ID)) {
        return jsonError(404, 'not_found', 'Recurso não encontrado.');
      }

      const url = new URL(request.url);
      const query = (url.searchParams.get('query') ?? '').toLowerCase();

      const rows = supportedCitiesFixture.filter((city) =>
        city.name.toLowerCase().includes(query),
      );

      return HttpResponse.json({ data: rows });
    },
  ),

  http.get(apiUrl('/api/v1/schools/:schoolId/billing/fiscal_credentials'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const schoolId = Number(params.schoolId);
    return HttpResponse.json({ data: fiscalCredentialsBySchool[schoolId] ?? [] });
  }),

  http.post(apiUrl('/api/v1/schools/:schoolId/billing/fiscal_credentials'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const schoolId = Number(params.schoolId);
    const credential = {
      id: 901,
      school_id: schoolId,
      instrument: 'service_invoice',
      provider: 'spedy',
      active: true,
      client_id: '',
      certificate_fingerprint: null,
      certificate_expires_at: null,
      uploaded_at: '2026-08-17T12:00:00Z',
      uploaded_by_id: 1,
    };
    fiscalCredentialsBySchool[schoolId] = [credential];

    return HttpResponse.json({ data: credential }, { status: 201 });
  }),

  http.post(
    apiUrl('/api/v1/schools/:schoolId/billing/fiscal_credentials/certificate'),
    async ({ request, params }) => {
      if (!hasFreshToken(request)) {
        return expiredToken();
      }

      if (params.schoolId !== String(SCHOOL_ID)) {
        return jsonError(404, 'not_found', 'Recurso não encontrado.');
      }

      const schoolId = Number(params.schoolId);
      const existing = fiscalCredentialsBySchool[schoolId]?.[0] ?? {
        id: 901,
        school_id: schoolId,
        instrument: 'service_invoice',
        provider: 'spedy',
        active: true,
        client_id: '',
        uploaded_at: '2026-08-17T12:00:00Z',
        uploaded_by_id: 1,
      };

      return HttpResponse.json({
        data: {
          ...existing,
          certificate_fingerprint: 'SHA256:FISCAL:01',
          certificate_expires_at: '2027-06-30T23:59:59Z',
        },
      });
    },
  ),

  http.get(apiUrl('/api/v1/schools/:schoolId/billing/service_invoices'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    return paginated(serviceInvoicesFixture, new URL(request.url));
  }),

  http.get(
    apiUrl('/api/v1/schools/:schoolId/billing/service_invoices/:id/pdf'),
    ({ request, params }) => {
      if (!hasFreshToken(request)) {
        return expiredToken();
      }

      if (params.schoolId !== String(SCHOOL_ID)) {
        return jsonError(404, 'not_found', 'Recurso não encontrado.');
      }

      return new HttpResponse(new Blob(['%PDF-nfse'], { type: 'application/pdf' }), {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      });
    },
  ),

  http.get(apiUrl('/api/v1/schools/:schoolId/me/service_invoices'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    if (params.schoolId !== String(SCHOOL_ID)) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const authorized = serviceInvoicesFixture.filter((invoice) => invoice.status === 'authorized');

    return paginated(authorized, new URL(request.url));
  }),

  http.get(
    apiUrl('/api/v1/schools/:schoolId/me/service_invoices/:id/pdf'),
    ({ request, params }) => {
      if (!hasFreshToken(request)) {
        return expiredToken();
      }

      if (params.schoolId !== String(SCHOOL_ID)) {
        return jsonError(404, 'not_found', 'Recurso não encontrado.');
      }

      return new HttpResponse(new Blob(['%PDF-nfse-guardian'], { type: 'application/pdf' }), {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      });
    },
  ),
];
