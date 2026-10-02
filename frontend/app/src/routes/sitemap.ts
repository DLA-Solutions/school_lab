import paths from './paths';
import type { RouteAudience } from 'utils/membership/audience';
import type { MembershipRole } from 'types/auth';

export type NavSection = 'primary' | 'family' | 'billing' | 'settings' | 'accounts';

export interface SubMenuItem {
  name: string;
  pathName: string;
  path: string;
  items?: SubMenuItem[];
  requiredPermission?: string;
  audience?: RouteAudience;
}

export interface MenuItem {
  id: string;
  subheader: string;
  path?: string;
  icon?: string;
  avatar?: string;
  items?: SubMenuItem[];
  /** When set, the item is hidden unless the current membership includes this permission key. */
  requiredPermission?: string;
  /**
   * When set, the item is hidden from everyone but the school's owner. Stronger than a permission
   * key: an owner-only entry is one the school's other staff must not reach even when they hold
   * every permission there is.
   */
  ownerOnly?: boolean;
  /**
   * Which profile context may see this entry. Defaults to `staff` when omitted.
   * Permission keys narrow staff/teacher access; they never turn a staff route into a guardian route.
   */
  audience?: RouteAudience;
  /**
   * Narrows an `audience` bucket to exclude specific roles — e.g. a `staff`-audience item that
   * `teacher` should not see even though `teacher` otherwise collapses into the `staff` audience.
   */
  excludeRoles?: MembershipRole[];
  /** Sidebar grouping — operational vs billing vs school platform settings. */
  section?: NavSection;
}

const sitemap: MenuItem[] = [
  {
    id: 'dashboard',
    subheader: 'nav.dashboard',
    path: paths.dashboard,
    icon: 'mingcute:home-1-fill',
    audience: 'shared',
    // Dashboard surfaces billing/people KPIs a teacher has no permission for; a teacher's
    // landing content comes from the academic routes below instead.
    excludeRoles: ['teacher'],
    section: 'primary',
  },
  {
    id: 'my-charges',
    subheader: 'nav.myCharges',
    path: paths.myCharges,
    icon: 'mingcute:bill-line',
    audience: 'guardian',
    section: 'family',
  },
  {
    id: 'my-health-records',
    subheader: 'nav.myHealthRecords',
    path: paths.myHealthRecords,
    icon: 'mingcute:heartbeat-line',
    audience: 'guardian',
    section: 'family',
  },
  {
    id: 'my-pickups',
    subheader: 'nav.myPickups',
    path: paths.myPickups,
    icon: 'mingcute:user-follow-line',
    audience: 'guardian',
    section: 'family',
  },
  {
    id: 'students',
    subheader: 'nav.students',
    path: paths.students,
    icon: 'mingcute:school-line',
    audience: 'staff',
    requiredPermission: 'manage_people',
    section: 'primary',
  },
  {
    id: 'guardians',
    subheader: 'nav.guardians',
    path: paths.guardians,
    icon: 'mingcute:user-2-fill',
    audience: 'staff',
    requiredPermission: 'manage_people',
    section: 'primary',
  },
  {
    id: 'preceptorship',
    subheader: 'nav.preceptorship',
    path: paths.preceptorship,
    icon: 'mingcute:quill-pen-line',
    audience: 'staff',
    requiredPermission: 'teach',
    section: 'primary',
  },
  {
    id: 'report-cards',
    subheader: 'nav.reportCards',
    path: paths.reportCards,
    icon: 'mingcute:report-forms-line',
    audience: 'staff',
    requiredPermission: 'manage_academic',
    section: 'primary',
  },
  {
    id: 'my-preceptorship',
    subheader: 'nav.myPreceptorship',
    path: paths.myPreceptorship,
    icon: 'mingcute:quill-pen-line',
    audience: 'guardian',
    section: 'family',
  },
  {
    id: 'my-report-cards',
    subheader: 'nav.myReportCards',
    path: paths.myReportCards,
    icon: 'mingcute:report-forms-line',
    audience: 'guardian',
    section: 'family',
  },
  {
    id: 'my-tax-declarations',
    subheader: 'nav.myTaxDeclarations',
    path: paths.myTaxDeclarations,
    icon: 'mingcute:file-certificate-line',
    audience: 'guardian',
    section: 'family',
  },
  {
    id: 'requests',
    subheader: 'nav.requests',
    path: paths.requests,
    icon: 'mingcute:inbox-line',
    audience: 'staff',
    requiredPermission: 'manage_documents',
    section: 'primary',
  },
  {
    id: 'my-requests',
    subheader: 'nav.myRequests',
    path: paths.myRequests,
    icon: 'mingcute:inbox-line',
    audience: 'guardian',
    section: 'family',
  },
  {
    id: 'collaborators',
    subheader: 'nav.collaborators',
    path: paths.collaborators,
    icon: 'mingcute:presentation-2-line',
    audience: 'staff',
    // Staff directory — a teacher has no business browsing their colleagues' records.
    excludeRoles: ['teacher'],
    section: 'primary',
  },
  {
    id: 'grades',
    subheader: 'nav.grades',
    path: paths.grades,
    icon: 'mingcute:edit-4-line',
    audience: 'staff',
    section: 'primary',
  },
  {
    id: 'lessons',
    subheader: 'nav.lessons',
    path: paths.lessons,
    icon: 'mingcute:book-5-line',
    audience: 'staff',
    // Class/subject configuration is the Secretaria's job — a teacher has no business
    // configuring classes or subjects.
    excludeRoles: ['teacher'],
    section: 'primary',
  },
  {
    id: 'job-positions',
    subheader: 'nav.jobPositions',
    path: paths.jobPositions,
    icon: 'mingcute:idcard-line',
    audience: 'staff',
    excludeRoles: ['teacher'],
    section: 'primary',
  },
  {
    id: 'charges',
    subheader: 'nav.charges',
    path: paths.charges,
    icon: 'mingcute:bill-line',
    audience: 'staff',
    requiredPermission: 'manage_billing',
    section: 'billing',
  },
  {
    id: 'plans',
    subheader: 'nav.plans',
    path: paths.plans,
    icon: 'mingcute:currency-dollar-line',
    audience: 'staff',
    requiredPermission: 'manage_billing',
    section: 'billing',
  },
  {
    id: 'billing-settings',
    subheader: 'nav.billingSettings',
    path: paths.billingSettings,
    icon: 'mingcute:settings-3-line',
    audience: 'staff',
    requiredPermission: 'manage_billing',
    section: 'billing',
  },
  {
    id: 'service-invoices',
    subheader: 'nav.serviceInvoices',
    path: paths.serviceInvoices,
    icon: 'mingcute:file-certificate-line',
    audience: 'staff',
    requiredPermission: 'manage_billing',
    section: 'billing',
  },
  {
    id: 'contract-template',
    subheader: 'nav.contract',
    path: paths.contractTemplate,
    icon: 'mingcute:document-2-line',
    audience: 'staff',
    requiredPermission: 'manage_billing',
    section: 'billing',
  },
  {
    // The Autentique token creates documents in the school's name, so it sits with the owner —
    // the same person who signs for the school — rather than with staff at large.
    id: 'signature-credentials',
    subheader: 'nav.signatureCredentials',
    path: paths.signatureCredentials,
    icon: 'mingcute:quill-pen-line',
    audience: 'staff',
    ownerOnly: true,
    section: 'settings',
  },
  {
    id: 'platform-subscription',
    subheader: 'nav.platformSubscription',
    path: paths.platformSubscription,
    icon: 'mingcute:vip-2-line',
    audience: 'staff',
    requiredPermission: 'manage_school_settings',
    section: 'settings',
  },
  {
    // Quem entra no sistema, e com qual papel. Fica por último no menu: é administração de
    // contas, consultada de vez em quando, e não parte do dia a dia das telas acima.
    id: 'users',
    subheader: 'nav.users',
    path: paths.users,
    icon: 'mingcute:user-setting-line',
    audience: 'staff',
    requiredPermission: 'manage_people',
    section: 'accounts',
  },
];

/**
 * Reachable places that are not menu entries.
 *
 * Turmas and Matérias moved inside Aulas as tabs, which took them out of the nav — but someone
 * typing "Turmas" into the search still means to go there, and a search that stopped finding them
 * would read as the pages having been removed.
 */
export const searchableSubPages: MenuItem[] = [
  {
    id: 'school-classes',
    subheader: 'nav.classes',
    path: `${paths.lessons}?tab=classes`,
    audience: 'staff',
    section: 'primary',
  },
  {
    id: 'subjects',
    subheader: 'nav.subjects',
    path: `${paths.lessons}?tab=subjects`,
    audience: 'staff',
    section: 'primary',
  },
];

export default sitemap;
