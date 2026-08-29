import { HttpResponse, http } from 'msw';
import { AuthUser, Membership } from 'types/auth';
import { PlatformAudit } from 'types/audit';
import { HelpTaxonomyCategory } from 'types/helpTaxonomy';
import { SchoolModulesMap } from 'types/modules';
import { PlatformOperator } from 'types/operator';
import { SchoolGroup } from 'types/schoolGroup';
import { School } from 'types/school';
import { PlatformInvoice, PlatformPlan, PlatformSubscription } from 'types/subscription';
import { SchoolYear } from 'types/schoolYear';
import { PlatformUser } from 'types/user';
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

const defaultProvisioningMemberships = (): Membership[] => [
  {
    id: 50,
    school_id: 2,
    school_name: 'Escola Beta',
    role: 'staff',
    status: 'invited',
    email: 'diretor@example.com',
    role_template: {
      id: 102,
      name: 'Direção',
      system_key: 'director',
      is_system: true,
    },
    is_owner: true,
    segment_id: null,
    display_title: 'Diretor',
    permissions: [],
    permission_sources: {},
  },
];

const defaultPendingHandoffMemberships = (schoolId: number, schoolName: string): Membership[] => [
  {
    id: 60 + schoolId,
    school_id: schoolId,
    school_name: schoolName,
    role: 'staff',
    status: 'active',
    email: 'diretor@example.com',
    role_template: {
      id: 102,
      name: 'Direção',
      system_key: 'director',
      is_system: true,
    },
    is_owner: true,
    segment_id: null,
    display_title: 'Diretor',
    permissions: [],
    permission_sources: {},
  },
];

/** Invited staff on provisioning schools — mutated by POST memberships in tests. */
export const teamMembershipsBySchool: Record<number, Membership[]> = {
  2: defaultProvisioningMemberships(),
  3: defaultPendingHandoffMemberships(3, 'Escola Gama'),
};

export const resetTeamMembershipsBySchool = () => {
  Object.keys(teamMembershipsBySchool).forEach((schoolId) => {
    delete teamMembershipsBySchool[Number(schoolId)];
  });
  teamMembershipsBySchool[2] = defaultProvisioningMemberships();
  teamMembershipsBySchool[3] = defaultPendingHandoffMemberships(3, 'Escola Gama');
};
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
  platform_permissions: ['provision_school'],
};

export const backofficeOpsMembership: Membership = {
  ...backofficeMembership,
  id: 21,
  email: 'ops@example.com',
  platform_permissions: ['manage_backoffice_ops', 'provision_school'],
};

export const backofficeUser: AuthUser = {
  id: 5,
  email: 'backoffice@example.com',
  status: 'active',
  memberships: [backofficeMembership],
  guardian_profiles: [],
};

export const backofficeOpsUser: AuthUser = {
  id: 6,
  email: 'ops@example.com',
  status: 'active',
  memberships: [backofficeOpsMembership],
  guardian_profiles: [],
};

export const sampleSchools: School[] = [
  {
    id: 1,
    name: 'Escola Alpha',
    cnpj: '12.345.678/0001-90',
    address: 'Rua A, 100',
    saas_plan: 'standard',
    school_group_id: null,
    onboarding_status: 'active',
    onboarding_mode: 'self_serve',
    billing_waived_at: null,
    segments_skipped_at: null,
    created_at: '2025-06-01T12:00:00Z',
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
    billing_waived_at: null,
    segments_skipped_at: null,
    created_at: '2026-08-01T12:00:00Z',
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
    billing_waived_at: null,
    segments_skipped_at: null,
    created_at: '2026-07-15T12:00:00Z',
  },
];

export const sampleDiscardedSchools: School[] = [
  {
    id: 4,
    name: 'Escola Delta',
    cnpj: '98.765.432/0001-10',
    address: 'Rua D, 400',
    saas_plan: 'partner',
    school_group_id: null,
    onboarding_status: 'active',
    onboarding_mode: 'self_serve',
    billing_waived_at: null,
    segments_skipped_at: null,
    created_at: '2025-01-10T12:00:00Z',
    discarded_at: '2026-07-01T09:00:00Z',
  },
];

export const resetSampleDiscardedSchools = () => {
  sampleSchools.splice(
    0,
    sampleSchools.length,
    ...sampleSchools.filter((school) => school.id !== 4),
  );

  sampleDiscardedSchools.splice(0, sampleDiscardedSchools.length, {
    id: 4,
    name: 'Escola Delta',
    cnpj: '98.765.432/0001-10',
    address: 'Rua D, 400',
    saas_plan: 'partner',
    school_group_id: null,
    onboarding_status: 'active',
    onboarding_mode: 'self_serve',
    billing_waived_at: null,
    segments_skipped_at: null,
    created_at: '2025-01-10T12:00:00Z',
    discarded_at: '2026-07-01T09:00:00Z',
  });
};

export const sampleAudits: PlatformAudit[] = [
  {
    id: 1,
    created_at: '2026-08-10T14:30:00Z',
    school_id: 1,
    actor: { id: 1, type: 'User' },
    action: 'update',
    auditable_type: 'SchoolModule',
    changed_keys: ['billing'],
    audited_changes: { enabled: [true, false] },
  },
  {
    id: 2,
    created_at: '2026-08-09T10:00:00Z',
    school_id: 2,
    actor: { id: 1, type: 'User' },
    action: 'create',
    auditable_type: 'SchoolYear',
    changed_keys: ['name', 'starts_on', 'ends_on'],
    audited_changes: { name: ['', '[REDACTED]'] },
  },
  {
    id: 3,
    created_at: '2026-07-01T09:05:00Z',
    school_id: 4,
    actor: { id: 1, type: 'User' },
    action: 'destroy',
    auditable_type: 'School',
    changed_keys: ['discarded_at'],
    audited_changes: { discarded_at: [null, '2026-07-01T09:00:00Z'] },
  },
];

export const sampleSchoolGroups: SchoolGroup[] = [
  {
    id: 1,
    name: 'Rede ABC',
    headquarters_cnpj: '00.000.000/0001-91',
    schools_count: 2,
    created_at: '2026-01-01T12:00:00Z',
    updated_at: '2026-01-01T12:00:00Z',
  },
  {
    id: 2,
    name: 'Grupo Norte',
    headquarters_cnpj: null,
    schools_count: 0,
    created_at: '2026-02-01T12:00:00Z',
    updated_at: '2026-02-01T12:00:00Z',
  },
];

export const samplePlans: PlatformPlan[] = [
  {
    id: 1,
    key: 'starter',
    name: 'Starter',
    monthly_amount_cents: 29_900,
    intervals: [
      { billing_interval: 'month', amount_cents: 29_900, provider: 'asaas' },
      { billing_interval: 'year', amount_cents: 299_000, provider: 'asaas' },
      { billing_interval: 'month', amount_cents: 29_900, provider: 'manual' },
      { billing_interval: 'year', amount_cents: 299_000, provider: 'manual' },
    ],
    created_at: '2026-01-01T12:00:00Z',
    updated_at: '2026-01-01T12:00:00Z',
  },
  {
    id: 2,
    key: 'pro',
    name: 'Pro',
    monthly_amount_cents: 59_900,
    intervals: [
      { billing_interval: 'month', amount_cents: 59_900, provider: 'asaas' },
      { billing_interval: 'year', amount_cents: 599_000, provider: 'asaas' },
    ],
    created_at: '2026-01-01T12:00:00Z',
    updated_at: '2026-01-01T12:00:00Z',
  },
];

export const sampleSubscriptions: PlatformSubscription[] = [
  {
    id: 1,
    school_id: 1,
    platform_plan_id: 1,
    status: 'active',
    trial_ends_at: null,
    current_period_start: '2026-08-01T00:00:00Z',
    current_period_end: '2026-09-01T00:00:00Z',
    billing_interval: 'month',
    provider: 'asaas',
    collection_method: 'automatic',
    cancel_at_period_end: false,
    canceled_at: null,
    created_at: '2026-01-15T12:00:00Z',
    updated_at: '2026-01-15T12:00:00Z',
    platform_plan: samplePlans[0],
    school: { id: 1, name: 'Escola Alpha', onboarding_status: 'active' },
  },
  {
    id: 2,
    school_id: 2,
    platform_plan_id: 1,
    status: 'active',
    trial_ends_at: null,
    current_period_start: '2026-08-11T00:00:00Z',
    current_period_end: '2026-09-11T00:00:00Z',
    billing_interval: 'year',
    provider: 'manual',
    collection_method: 'manual',
    cancel_at_period_end: false,
    canceled_at: null,
    created_at: '2026-08-11T12:00:00Z',
    updated_at: '2026-08-11T12:00:00Z',
    platform_plan: samplePlans[0],
    school: { id: 2, name: 'Escola Beta', onboarding_status: 'provisioning' },
  },
];

export const samplePlatformInvoices: PlatformInvoice[] = [
  {
    id: 10,
    status: 'open',
    amount_cents: 29_900,
    due_at: '2026-08-10T00:00:00Z',
    paid_at: null,
    hosted_invoice_url: 'https://www.asaas.com/i/example',
    payment_method: null,
    provider: 'asaas',
    external_invoice_id: 'inv_support_only',
    school_id: 1,
    platform_subscription_id: 1,
  },
];

export const defaultAnalyticsOverview = () => ({
  active_schools: 10,
  provisioning_count: 2,
  module_adoption: {
    communication: 0.9,
    academic: 0.85,
    billing: 0.8,
    documents: 0.75,
  },
  mrr_cents: 599_000,
  onboarding_funnel: {
    provisioning: 2,
    pending_handoff: 1,
    active: 10,
  },
});

export const sampleHelpTaxonomyCategories: HelpTaxonomyCategory[] = [
  {
    id: 1,
    name: 'Financeiro',
    slug: 'financeiro',
    module_key: 'billing',
    persona_tags: ['secretary'],
    position: 1,
    created_at: '2026-01-01T12:00:00Z',
    updated_at: '2026-01-01T12:00:00Z',
  },
  {
    id: 2,
    name: 'Comunicação',
    slug: 'comunicacao',
    module_key: 'communication',
    persona_tags: ['teacher', 'guardian'],
    position: 2,
    created_at: '2026-01-02T12:00:00Z',
    updated_at: '2026-01-02T12:00:00Z',
  },
];

export const sampleOperators: PlatformOperator[] = [
  {
    id: backofficeUser.id,
    email: backofficeUser.email,
    status: 'active',
    platform_permissions: ['manage_backoffice_ops', 'provision_school'],
  },
  {
    id: 6,
    email: 'ops@example.com',
    status: 'active',
    platform_permissions: ['provision_school'],
  },
];

const filterSchoolRows = (rows: School[], url: URL) => {
  let filtered = [...rows];

  const q = url.searchParams.get('q')?.trim().toLowerCase();
  const saasPlan = url.searchParams.get('saas_plan');
  const createdAfter = url.searchParams.get('created_after');
  const createdBefore = url.searchParams.get('created_before');
  const status = url.searchParams.get('onboarding_status');
  const mode = url.searchParams.get('onboarding_mode');

  if (q) {
    filtered = filtered.filter((school) => {
      const nameMatch = school.name.toLowerCase().includes(q);
      const cnpjDigits = school.cnpj?.replace(/\D/g, '') ?? '';
      const queryDigits = q.replace(/\D/g, '');

      return nameMatch || (queryDigits.length > 0 && cnpjDigits.includes(queryDigits));
    });
  }

  if (saasPlan) {
    filtered = filtered.filter((school) => school.saas_plan === saasPlan);
  }

  if (createdAfter) {
    filtered = filtered.filter((school) => (school.created_at ?? '') >= `${createdAfter}T00:00:00Z`);
  }

  if (createdBefore) {
    filtered = filtered.filter((school) => (school.created_at ?? '') <= `${createdBefore}T23:59:59Z`);
  }

  if (status) {
    filtered = filtered.filter((school) => school.onboarding_status === status);
  }

  if (mode) {
    filtered = filtered.filter((school) => school.onboarding_mode === mode);
  }

  return filtered;
};

const defaultModules = (): SchoolModulesMap => ({
  communication: true,
  academic: true,
  billing: true,
  documents: true,
});

/** Mutable module flags per school — tests override billing off for dashboard alerts. */
export const modulesBySchool: Record<number, SchoolModulesMap> = {
  1: defaultModules(),
  2: defaultModules(),
  3: { ...defaultModules(), billing: false },
};

export const resetModulesBySchool = () => {
  modulesBySchool[1] = defaultModules();
  modulesBySchool[2] = defaultModules();
  modulesBySchool[3] = { ...defaultModules(), billing: false };
};

/** Active school years per school — provisioning school 2 starts without one. */
export const activeSchoolYearBySchool: Record<number, SchoolYear | null> = {
  1: {
    id: 10,
    school_id: 1,
    name: '2026',
    starts_on: '2026-02-01',
    ends_on: '2026-12-15',
    period_template: 'trimester',
    status: 'active',
  },
  2: null,
  3: {
    id: 11,
    school_id: 3,
    name: '2026',
    starts_on: '2026-02-01',
    ends_on: '2026-12-15',
    period_template: 'trimester',
    status: 'active',
  },
};

export const resetActiveSchoolYears = () => {
  activeSchoolYearBySchool[1] = {
    id: 10,
    school_id: 1,
    name: '2026',
    starts_on: '2026-02-01',
    ends_on: '2026-12-15',
    period_template: 'trimester',
    status: 'active',
  };
  activeSchoolYearBySchool[2] = null;
  activeSchoolYearBySchool[3] = {
    id: 11,
    school_id: 3,
    name: '2026',
    starts_on: '2026-02-01',
    ends_on: '2026-12-15',
    period_template: 'trimester',
    status: 'active',
  };
};

export const defaultOperationalSummary = () => ({
  credentials_expiring: [
    {
      school_id: 1,
      school_name: 'Escola Alpha',
      certificate_expires_at: '2026-09-01T12:00:00Z',
      days_remaining: 14,
    },
  ],
  schools_with_disabled_modules: [
    {
      school_id: 3,
      school_name: 'Escola Gama',
      disabled_modules: ['billing'],
    },
  ],
  provisioning_backlog_count: 1,
});

let nextSchoolYearId = 100;

const schoolDetailPayload = (school: School) => ({
  ...school,
  modules: modulesBySchool[school.id] ?? defaultModules(),
  active_school_year: activeSchoolYearBySchool[school.id] ?? null,
  aggregate_counts: {
    students_count: school.id * 10,
    staff_count: school.id,
  },
});

/** Mutable platform users for list/disable/enable handlers in tests. */
export const sampleUsers: PlatformUser[] = [
  {
    id: 1,
    email: 'maria@example.com',
    status: 'active',
    memberships: [
      {
        role: 'staff',
        school_name: 'Escola Alpha',
      },
    ],
  },
  {
    id: 2,
    email: 'disabled@example.com',
    status: 'disabled',
    memberships: [
      {
        role: 'guardian',
        school_name: 'Escola Alpha',
      },
    ],
  },
  {
    id: backofficeUser.id,
    email: backofficeUser.email,
    status: 'active',
    memberships: [
      {
        role: 'backoffice',
        school_name: null,
      },
    ],
  },
];

export const resetSampleUsers = () => {
  sampleUsers[0]!.status = 'active';
  sampleUsers[1]!.status = 'disabled';
};

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

  http.post(apiUrl('/api/v1/schools/:schoolId/people/memberships/:id/invite'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const schoolId = Number(params.schoolId);
    const membershipId = Number(params.id);
    const memberships = teamMembershipsBySchool[schoolId] ?? [];
    const membership = memberships.find((entry) => entry.id === membershipId);

    if (!membership) {
      return jsonError(404, 'not_found', 'Membership not found.');
    }

    return HttpResponse.json({
      data: {
        id: membership.id,
        school_id: membership.school_id,
        role: membership.role,
        status: 'invited',
        email: membership.email,
        is_owner: membership.is_owner,
        display_title: membership.display_title,
        role_template: membership.role_template,
      },
    });
  }),

  http.post(apiUrl('/api/v1/schools/:schoolId/handoff'), async ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const body = (await request.json()) as { handoff?: { billing_waived?: boolean } };
    const billingWaived = body.handoff?.billing_waived === true;
    const schoolId = Number(params.schoolId);
    const school = sampleSchools.find((row) => row.id === schoolId);
    const ownerMembership = (teamMembershipsBySchool[schoolId] ?? []).find(
      (membership) => membership.is_owner === true,
    );
    const ownerActive = ownerMembership?.status === 'active';
    const billingReady =
      billingWaived || hasActiveBankCredentials(schoolId) || Boolean(school?.billing_waived_at);

    if (school?.onboarding_status === 'provisioning') {
      const checklist: string[] = [];
      if (!billingReady) {
        checklist.push('billing');
      }
      if (!activeSchoolYearBySchool[schoolId]?.status || activeSchoolYearBySchool[schoolId]?.status !== 'active') {
        checklist.push('school_year');
      }

      if (checklist.length > 0) {
        return jsonError(422, 'validation_error', 'Checklist incompleta.', { checklist });
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

    if (school?.onboarding_status === 'pending_handoff') {
      const checklist: string[] = [];
      if (!ownerActive) {
        checklist.push('owner_active');
      }
      if (!billingReady) {
        checklist.push('billing');
      }
      if (!activeSchoolYearBySchool[schoolId]?.status || activeSchoolYearBySchool[schoolId]?.status !== 'active') {
        checklist.push('school_year');
      }

      if (checklist.length > 0) {
        return jsonError(422, 'validation_error', 'Checklist incompleta.', { checklist });
      }

      return HttpResponse.json({
        data: {
          id: school.id,
          name: school.name,
          cnpj: school.cnpj,
          address: school.address,
          saas_plan: school.saas_plan,
          school_group_id: school.school_group_id,
          onboarding_status: 'active',
          onboarding_mode: school.onboarding_mode,
          billing_waived_at: billingWaived ? '2026-08-10T12:00:00Z' : school.billing_waived_at ?? null,
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

    const url = new URL(request.url);
    const include = url.searchParams.get('include') ?? '';

    if (include.includes('modules') || include.includes('active_school_year') || include.includes('aggregate_counts')) {
      return HttpResponse.json({ data: schoolDetailPayload(school) });
    }

    return HttpResponse.json({ data: school });
  }),

  http.get(apiUrl('/api/v1/schools/:schoolId/modules'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const schoolId = Number(params.schoolId);

    return HttpResponse.json({
      data: {
        modules: modulesBySchool[schoolId] ?? defaultModules(),
      },
    });
  }),

  http.patch(apiUrl('/api/v1/schools/:schoolId/modules'), async ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const schoolId = Number(params.schoolId);
    const body = (await request.json()) as { modules?: Partial<SchoolModulesMap> };
    const current = modulesBySchool[schoolId] ?? defaultModules();
    const next = { ...current, ...body.modules };
    modulesBySchool[schoolId] = next;

    return HttpResponse.json({ data: { modules: next } });
  }),

  http.get(apiUrl('/api/v1/schools/:schoolId/school_years/active'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const schoolId = Number(params.schoolId);
    const active = activeSchoolYearBySchool[schoolId];

    if (!active || active.status !== 'active') {
      return jsonError(422, 'no_active_school_year', 'Nenhum ano letivo ativo.');
    }

    return HttpResponse.json({ data: active });
  }),

  http.post(apiUrl('/api/v1/schools/:schoolId/school_years'), async ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const schoolId = Number(params.schoolId);
    const body = (await request.json()) as {
      name?: string;
      starts_on?: string;
      ends_on?: string;
      period_template?: string;
    };

    if (body.starts_on && body.ends_on && body.ends_on < body.starts_on) {
      return jsonError(422, 'validation_error', 'Datas inválidas.', {
        ends_on: ['must be on or after starts_on'],
      });
    }

    const draft: SchoolYear = {
      id: nextSchoolYearId++,
      school_id: schoolId,
      name: body.name?.trim() || '2026',
      starts_on: body.starts_on || '2026-02-01',
      ends_on: body.ends_on || '2026-12-15',
      period_template: (body.period_template as SchoolYear['period_template']) || 'trimester',
      status: 'draft',
    };

    return HttpResponse.json(
      {
        data: {
          ...draft,
          academic_periods: [
            {
              id: 3000 + schoolId,
              name: '1º trimestre',
              sequence: 1,
              starts_on: draft.starts_on,
              ends_on: '2026-05-15',
              closure_status: 'open',
            },
          ],
        },
      },
      { status: 201 },
    );
  }),

  http.post(
    apiUrl('/api/v1/schools/:schoolId/school_years/:yearId/activate'),
    ({ request, params }) => {
      if (!hasFreshToken(request)) {
        return expiredToken();
      }

      const schoolId = Number(params.schoolId);
      const yearId = Number(params.yearId);

      activeSchoolYearBySchool[schoolId] = {
        id: yearId,
        school_id: schoolId,
        name: '2026',
        starts_on: '2026-02-01',
        ends_on: '2026-12-15',
        period_template: 'trimester',
        status: 'active',
      };

      return HttpResponse.json({
        data: {
          id: yearId,
          status: 'active',
          archived_year_id: null,
        },
      });
    },
  ),

  http.get(apiUrl('/api/v1/platform/operational_summary'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    return HttpResponse.json({ data: defaultOperationalSummary() });
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
    const discarded = url.searchParams.get('discarded') === 'true';
    const source = discarded ? sampleDiscardedSchools : sampleSchools;
    const rows = filterSchoolRows(source, url);

    return paginated(rows, url);
  }),

  http.post(apiUrl('/api/v1/schools/:schoolId/restore'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const schoolId = Number(params.schoolId);
    const index = sampleDiscardedSchools.findIndex((row) => row.id === schoolId);

    if (index === -1) {
      return jsonError(409, 'not_discarded', 'A escola não está arquivada.');
    }

    const [restored] = sampleDiscardedSchools.splice(index, 1);
    const activeSchool = { ...restored, discarded_at: null };
    sampleSchools.push(activeSchool);

    return HttpResponse.json({ data: activeSchool });
  }),

  http.post(apiUrl('/api/v1/schools/:schoolId/provisioning/resend_invites'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    return HttpResponse.json({ data: { resent_count: 2 } });
  }),

  http.get(apiUrl('/api/v1/platform/audits'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const url = new URL(request.url);
    let rows = [...sampleAudits];

    const schoolId = url.searchParams.get('school_id');
    const action = url.searchParams.get('action');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');

    if (schoolId) {
      rows = rows.filter((row) => String(row.school_id) === schoolId);
    }

    if (action) {
      rows = rows.filter((row) => row.action === action);
    }

    if (dateFrom) {
      rows = rows.filter((row) => row.created_at >= `${dateFrom}T00:00:00Z`);
    }

    if (dateTo) {
      rows = rows.filter((row) => row.created_at <= `${dateTo}T23:59:59Z`);
    }

    return paginated(rows, url);
  }),

  http.get(apiUrl('/api/v1/platform/operators'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    return paginated(sampleOperators, new URL(request.url));
  }),

  http.get(apiUrl('/api/v1/users'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const url = new URL(request.url);
    let rows = [...sampleUsers];

    const q = url.searchParams.get('q')?.trim().toLowerCase();
    const status = url.searchParams.get('status');

    if (q) {
      rows = rows.filter((user) => user.email.toLowerCase().includes(q));
    }

    if (status) {
      rows = rows.filter((user) => user.status === status);
    }

    return paginated(rows, url);
  }),

  http.post(apiUrl('/api/v1/users/:id/disable'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const user = sampleUsers.find((row) => String(row.id) === String(params.id));

    if (!user) {
      return jsonError(404, 'not_found', 'Usuário não encontrado.');
    }

    user.status = 'disabled';

    return new HttpResponse(null, { status: 204 });
  }),

  http.post(apiUrl('/api/v1/users/:id/enable'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const user = sampleUsers.find((row) => String(row.id) === String(params.id));

    if (!user) {
      return jsonError(404, 'not_found', 'Usuário não encontrado.');
    }

    user.status = 'active';

    return new HttpResponse(null, { status: 204 });
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

  http.get(apiUrl('/api/v1/platform/school_groups'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    return paginated(sampleSchoolGroups, new URL(request.url));
  }),

  http.post(apiUrl('/api/v1/platform/school_groups'), async ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const body = (await request.json()) as {
      school_group?: { name?: string; headquarters_cnpj?: string | null };
    };

    if (!body.school_group?.name?.trim()) {
      return jsonError(422, 'validation_error', 'Não foi possível salvar.');
    }

    const created: SchoolGroup = {
      id: sampleSchoolGroups.length + 1,
      name: body.school_group.name.trim(),
      headquarters_cnpj: body.school_group.headquarters_cnpj ?? null,
      schools_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    sampleSchoolGroups.push(created);

    return HttpResponse.json({ data: created }, { status: 201 });
  }),

  http.get(apiUrl('/api/v1/platform/school_groups/:id'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const group = sampleSchoolGroups.find((row) => String(row.id) === String(params.id));

    if (!group) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    return HttpResponse.json({ data: group });
  }),

  http.patch(apiUrl('/api/v1/platform/school_groups/:id'), async ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const group = sampleSchoolGroups.find((row) => String(row.id) === String(params.id));

    if (!group) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const body = (await request.json()) as {
      school_group?: { name?: string; headquarters_cnpj?: string | null };
    };

    if (body.school_group?.name) {
      group.name = body.school_group.name;
    }

    if (body.school_group?.headquarters_cnpj !== undefined) {
      group.headquarters_cnpj = body.school_group.headquarters_cnpj;
    }

    group.updated_at = new Date().toISOString();

    return HttpResponse.json({ data: group });
  }),

  http.delete(apiUrl('/api/v1/platform/school_groups/:id'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const index = sampleSchoolGroups.findIndex((row) => String(row.id) === String(params.id));

    if (index === -1) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    if (sampleSchoolGroups[index]!.schools_count > 0) {
      return jsonError(409, 'group_has_schools', 'O grupo ainda possui escolas vinculadas.');
    }

    sampleSchoolGroups.splice(index, 1);

    return new HttpResponse(null, { status: 204 });
  }),

  http.get(apiUrl('/api/v1/platform/plans'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    return HttpResponse.json({ data: samplePlans });
  }),

  http.get(apiUrl('/api/v1/platform/subscriptions'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const url = new URL(request.url);
    let rows = [...sampleSubscriptions];
    const schoolId = url.searchParams.get('school_id');
    const status = url.searchParams.get('status');

    if (schoolId) {
      rows = rows.filter((row) => String(row.school_id) === schoolId);
    }

    if (status) {
      rows = rows.filter((row) => row.status === status);
    }

    return paginated(rows, url);
  }),

  http.post(apiUrl('/api/v1/platform/subscriptions'), async ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const body = (await request.json()) as {
      subscription?: {
        school_id?: number;
        platform_plan_id?: number;
        status?: string;
        billing_interval?: string;
        provider?: string;
        trial?: boolean;
      };
    };

    if (
      sampleSubscriptions.some((row) => row.school_id === body.subscription?.school_id)
    ) {
      return jsonError(409, 'subscription_exists', 'A escola já possui assinatura.');
    }

    const plan = samplePlans.find((row) => row.id === body.subscription?.platform_plan_id);

    const created: PlatformSubscription = {
      id: sampleSubscriptions.length + 1,
      school_id: body.subscription?.school_id ?? 0,
      platform_plan_id: body.subscription?.platform_plan_id ?? 0,
      status: (body.subscription?.status as PlatformSubscription['status']) ?? 'active',
      trial_ends_at: null,
      current_period_end: null,
      billing_interval: (body.subscription?.billing_interval as PlatformSubscription['billing_interval']) ?? 'month',
      provider: (body.subscription?.provider as PlatformSubscription['provider']) ?? 'manual',
      collection_method: body.subscription?.provider === 'asaas' ? 'automatic' : 'manual',
      cancel_at_period_end: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      platform_plan: plan,
      school: sampleSchools.find((row) => row.id === body.subscription?.school_id)
        ? {
            id: body.subscription!.school_id!,
            name: sampleSchools.find((row) => row.id === body.subscription?.school_id)!.name,
            onboarding_status: sampleSchools.find((row) => row.id === body.subscription?.school_id)!
              .onboarding_status ?? null,
          }
        : undefined,
    };

    sampleSubscriptions.push(created);

    return HttpResponse.json({ data: created }, { status: 201 });
  }),

  http.patch(apiUrl('/api/v1/platform/subscriptions/:id'), async ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const subscription = sampleSubscriptions.find((row) => String(row.id) === String(params.id));

    if (!subscription) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const body = (await request.json()) as {
      subscription?: { platform_plan_id?: number; status?: string };
    };

    if (body.subscription?.platform_plan_id) {
      subscription.platform_plan_id = body.subscription.platform_plan_id;
      subscription.platform_plan = samplePlans.find((row) => row.id === body.subscription!.platform_plan_id);
    }

    if (body.subscription?.status) {
      subscription.status = body.subscription.status as PlatformSubscription['status'];
    }

    subscription.updated_at = new Date().toISOString();

    return HttpResponse.json({ data: subscription });
  }),

  http.post(apiUrl('/api/v1/platform/subscriptions/:id/checkout'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const subscription = sampleSubscriptions.find((row) => String(row.id) === String(params.id));

    if (!subscription) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    return HttpResponse.json({
      data: {
        checkout_url: 'https://www.asaas.com/i/example',
        billing_portal_url: null,
        subscription_id: subscription.id,
      },
    });
  }),

  http.get(apiUrl('/api/v1/platform/subscriptions/:id/invoices'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const rows = samplePlatformInvoices.filter(
      (invoice) => String(invoice.platform_subscription_id) === String(params.id),
    );

    return paginated(rows, new URL(request.url));
  }),

  http.post(apiUrl('/api/v1/platform/subscriptions/:id/change_plan'), async ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const subscription = sampleSubscriptions.find((row) => String(row.id) === String(params.id));

    if (!subscription) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const body = (await request.json()) as { plan_key?: string; billing_interval?: string };
    const plan = samplePlans.find((row) => row.key === body.plan_key);

    if (plan) {
      subscription.platform_plan_id = plan.id;
      subscription.platform_plan = plan;
    }

    if (body.billing_interval === 'month' || body.billing_interval === 'year') {
      subscription.billing_interval = body.billing_interval;
    }

    return HttpResponse.json({ data: subscription });
  }),

  http.post(apiUrl('/api/v1/platform/subscriptions/:id/cancel'), async ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const subscription = sampleSubscriptions.find((row) => String(row.id) === String(params.id));

    if (!subscription) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const body = (await request.json()) as { at_period_end?: boolean };
    subscription.cancel_at_period_end = body.at_period_end !== false;

    return HttpResponse.json({ data: subscription });
  }),

  http.get(apiUrl('/api/v1/platform/analytics/overview'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    return HttpResponse.json({ data: defaultAnalyticsOverview() });
  }),

  http.post(apiUrl('/api/v1/platform/impersonations'), async ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const body = (await request.json()) as {
      impersonation?: { school_id?: number; target_membership_id?: number };
    };

    const school = sampleSchools.find((row) => row.id === body.impersonation?.school_id);

    return HttpResponse.json(
      {
        data: {
          id: 1,
          operator_user_id: backofficeOpsUser.id,
          target_user_id: 2,
          school_id: body.impersonation?.school_id ?? 0,
          target_membership_id: body.impersonation?.target_membership_id ?? 0,
          expires_at: '2026-08-18T20:00:00Z',
          ended_at: null,
          created_at: new Date().toISOString(),
          operator_email: backofficeOpsUser.email,
          school_name: school?.name ?? 'Escola',
          active: true,
          access_token: 'impersonation-access-token',
          access_expires_at: '2026-08-18T20:00:00Z',
        },
      },
      { status: 201 },
    );
  }),

  http.delete(apiUrl('/api/v1/platform/impersonations/:id'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    return new HttpResponse(null, { status: 204 });
  }),

  http.get(apiUrl('/api/v1/platform/help_taxonomy/categories'), ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    return paginated(sampleHelpTaxonomyCategories, new URL(request.url));
  }),

  http.post(apiUrl('/api/v1/platform/help_taxonomy/categories'), async ({ request }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const body = (await request.json()) as {
      category?: {
        name?: string;
        module_key?: string | null;
        persona_tags?: string[];
        position?: number;
      };
    };

    if (!body.category?.name?.trim()) {
      return jsonError(422, 'validation_error', 'Não foi possível salvar.');
    }

    const created: HelpTaxonomyCategory = {
      id: sampleHelpTaxonomyCategories.length + 1,
      name: body.category.name.trim(),
      slug: body.category.name.trim().toLowerCase().replace(/\s+/g, '-'),
      module_key: body.category.module_key ?? null,
      persona_tags: (body.category.persona_tags ?? []) as HelpTaxonomyCategory['persona_tags'],
      position: body.category.position ?? 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    sampleHelpTaxonomyCategories.push(created);

    return HttpResponse.json({ data: created }, { status: 201 });
  }),

  http.patch(apiUrl('/api/v1/platform/help_taxonomy/categories/:id'), async ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const category = sampleHelpTaxonomyCategories.find(
      (row) => String(row.id) === String(params.id),
    );

    if (!category) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    const body = (await request.json()) as {
      category?: Partial<HelpTaxonomyCategory>;
    };

    Object.assign(category, body.category);
    category.updated_at = new Date().toISOString();

    return HttpResponse.json({ data: category });
  }),

  http.delete(apiUrl('/api/v1/platform/help_taxonomy/categories/:id'), ({ request, params }) => {
    if (!hasFreshToken(request)) {
      return expiredToken();
    }

    const index = sampleHelpTaxonomyCategories.findIndex(
      (row) => String(row.id) === String(params.id),
    );

    if (index === -1) {
      return jsonError(404, 'not_found', 'Recurso não encontrado.');
    }

    sampleHelpTaxonomyCategories.splice(index, 1);

    return new HttpResponse(null, { status: 204 });
  }),
];
