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
  /**
   * The inverse of `excludeRoles`: when set, only these roles see the entry, even though other
   * roles in the same `audience` bucket would otherwise match. Use for an item scoped to one
   * role specifically (e.g. a `staff`-audience item only `teacher` should reach) rather than a
   * permission key, which any role holding it would also see.
   */
  includeRoles?: MembershipRole[];
  /**
   * Staff-profile role template `system_key`s that may see the entry (secretary, coordination,
   * director). When set together with `includeRoles`, either match is enough — a teacher is a
   * membership role, and those offices are system keys on a staff membership.
   */
  includeSystemKeys?: string[];
  /**
   * The inverse of `includeSystemKeys`: staff holding one of these role templates do not see the
   * entry (they reach the same page another way — see `incident-notes`).
   */
  excludeSystemKeys?: string[];
  /** Sidebar grouping — operational vs billing vs school platform settings. */
  section?: NavSection;
}

/** Role templates that may use Atas da Escola (`docs/prds/documents-and-archive/livro-ata.md`). */
export const MINUTES_SYSTEM_KEYS = ['director', 'coordination', 'secretary'] as const;

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
    id: 'communication',
    subheader: 'nav.communication',
    path: paths.communication,
    icon: 'mingcute:message-2-line',
    audience: 'guardian',
    section: 'family',
  },
  {
    // The guardian's own side of "Ata" (BC7) — published incidents across all of this family's
    // children, merged into one list rather than one page per child.
    id: 'my-atas',
    subheader: 'nav.myAtas',
    path: paths.myAtas,
    icon: 'mingcute:file-line',
    audience: 'guardian',
    section: 'family',
  },
  {
    // Guardian read of BC11 — sent infant routine for a linked child (UC-DR04). Recording stays
    // on `daily-routine` for staff and teachers.
    id: 'my-daily-routine',
    subheader: 'nav.myDailyRoutine',
    path: paths.myDailyRoutine,
    icon: 'mingcute:baby-line',
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
    // Prospects before enrollment. Gated on the same `manage_enrollment` key `CrmContactPolicy`
    // checks, so the entry never shows for staff who would only get a 403.
    id: 'crm',
    subheader: 'nav.crm',
    path: paths.crm,
    icon: 'mingcute:contacts-line',
    audience: 'staff',
    requiredPermission: 'manage_enrollment',
    section: 'primary',
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
    // The school's own regulatory files (BC5) for audits. Same `manage_documents` key
    // `DocumentPolicy#manage_compliance?` checks; the `documents` module gate lives in
    // `visibleSitemap`.
    id: 'compliance',
    subheader: 'nav.compliance',
    path: paths.compliance,
    icon: 'mingcute:certificate-line',
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
    id: 'my-documents',
    subheader: 'nav.myDocuments',
    path: paths.myDocuments,
    icon: 'mingcute:folder-open-line',
    audience: 'guardian',
    section: 'family',
  },
  {
    // The collaborator's own side of the health profile (BC6) — scoped to the teacher role
    // specifically via `includeRoles`, not a permission key: any staff holding `manage_people`
    // would otherwise also pass a `staff`-audience filter, but only the teacher named on a
    // `Teacher` row has a profile to fill in here (resolved by login-email match).
    id: 'my-health-profile',
    subheader: 'nav.myHealthProfile',
    path: paths.myHealthProfile,
    icon: 'mingcute:heartbeat-line',
    audience: 'staff',
    includeRoles: ['teacher'],
    section: 'primary',
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
    id: 'lesson-plans',
    subheader: 'nav.lessonPlans',
    path: paths.lessonPlans,
    icon: 'mingcute:calendar-2-line',
    audience: 'staff',
    section: 'primary',
  },
  {
    // UC-LP04/AC-LP07: coordination's own screen over every teacher's lesson plans, filterable by
    // teacher/subject/class — a real permission key exists for this actor
    // (`LessonPlanPolicy#manage_academic_staff?`), unlike `lesson-plans` above, which branches by
    // role client-side because neither PRD defines one for "is a teacher".
    id: 'all-lesson-plans',
    subheader: 'nav.allLessonPlans',
    path: paths.allLessonPlans,
    icon: 'mingcute:calendar-2-line',
    audience: 'staff',
    requiredPermission: 'manage_academic',
    section: 'primary',
  },
  {
    // "Atas da Escola" (BC4 Livro Ata) — yearly books of minutes signed through Autentique. It
    // replaced the staff "Atas de reuniões" entry; the offices that may use it are role-template
    // system keys on a staff membership, the same split `staff-communication` uses.
    id: 'school-minutes',
    subheader: 'nav.schoolMinutes',
    path: paths.schoolMinutes,
    icon: 'mingcute:book-2-line',
    audience: 'staff',
    includeSystemKeys: [...MINUTES_SYSTEM_KEYS],
    section: 'primary',
  },
  {
    // "Notas de ocorrência" — the BC7 incident "Ata" screen (a teacher records for their own
    // classes, manage_academic staff school-wide, BR-IN03). It left the menu for director,
    // coordination and secretary: BR-LA08 moves their entry inside Atas da Escola as a secondary
    // link. Everyone else on staff (teachers above all, who have no other way in) keeps this
    // entry, so nobody loses a screen they had. The page degrades gracefully for staff who hold
    // neither role, same as before.
    id: 'incident-notes',
    subheader: 'nav.incidentNotes',
    path: paths.atas,
    icon: 'mingcute:file-line',
    audience: 'staff',
    excludeSystemKeys: [...MINUTES_SYSTEM_KEYS],
    section: 'primary',
  },
  {
    // BC11 "Rotina Infantil" — a teacher records/sends for their own assigned classes (BR-DR07),
    // manage_academic staff do the same for any class in the school. Same no-narrowing split as
    // lesson-plans/atas above: the page itself resolves which classes to offer per role.
    id: 'daily-routine',
    subheader: 'nav.dailyRoutine',
    path: paths.dailyRoutine,
    icon: 'mingcute:baby-line',
    audience: 'staff',
    section: 'primary',
  },
  {
    // Family chat for the school side. A teacher is a membership role; secretary, coordination,
    // and director are role-template system keys — the same split incident approval uses.
    id: 'staff-communication',
    subheader: 'nav.communication',
    path: paths.staffCommunication,
    icon: 'mingcute:message-2-line',
    audience: 'staff',
    includeRoles: ['teacher'],
    includeSystemKeys: ['secretary', 'coordination', 'director'],
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
