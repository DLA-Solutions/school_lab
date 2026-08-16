import { AuthUser, Membership, RoleTemplate, SchoolModuleKey } from 'types/auth';

const SCHOOL_MODULE_KEYS: SchoolModuleKey[] = ['communication', 'academic', 'billing', 'documents'];

const parseEnabledModules = (value: unknown): SchoolModuleKey[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter(
    (key): key is SchoolModuleKey =>
      typeof key === 'string' && SCHOOL_MODULE_KEYS.includes(key as SchoolModuleKey),
  );
};

const parseRoleTemplate = (value: unknown): RoleTemplate | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const template = value as Record<string, unknown>;

  if (typeof template.id !== 'number' || typeof template.name !== 'string') {
    return undefined;
  }

  return {
    id: template.id,
    name: template.name,
    system_key: typeof template.system_key === 'string' ? template.system_key : null,
    is_system: Boolean(template.is_system),
  };
};

/** Normalizes a membership from GET /me — optional W1 fields stay undefined when absent. */
export const parseMembership = (raw: unknown): Membership => {
  const membership = (raw ?? {}) as Record<string, unknown>;

  return {
    id: Number(membership.id),
    school_id: Number(membership.school_id),
    school_name: typeof membership.school_name === 'string' ? membership.school_name : null,
    role: String(membership.role ?? ''),
    status: String(membership.status ?? ''),
    email: typeof membership.email === 'string' ? membership.email : null,
    role_template: parseRoleTemplate(membership.role_template) ?? null,
    permissions: Array.isArray(membership.permissions)
      ? membership.permissions.filter((key): key is string => typeof key === 'string')
      : [],
    is_owner: typeof membership.is_owner === 'boolean' ? membership.is_owner : null,
    segment_id: typeof membership.segment_id === 'number' ? membership.segment_id : null,
    display_title: typeof membership.display_title === 'string' ? membership.display_title : null,
    permission_sources:
      membership.permission_sources && typeof membership.permission_sources === 'object'
        ? (membership.permission_sources as Record<string, string>)
        : {},
    enabled_modules: parseEnabledModules(membership.enabled_modules),
    school_onboarding_status:
      typeof membership.school_onboarding_status === 'string'
        ? membership.school_onboarding_status
        : undefined,
    school_onboarding_mode:
      typeof membership.school_onboarding_mode === 'string'
        ? membership.school_onboarding_mode
        : undefined,
  };
};

export const parseAuthUser = (raw: unknown): AuthUser | null => {
  if (raw == null) {
    return null;
  }

  const user = raw as Record<string, unknown>;

  return {
    id: Number(user.id),
    email: String(user.email ?? ''),
    status: String(user.status ?? ''),
    memberships: Array.isArray(user.memberships)
      ? user.memberships.map(parseMembership)
      : [],
    guardian_profiles: Array.isArray(user.guardian_profiles) ? user.guardian_profiles : [],
  };
};
