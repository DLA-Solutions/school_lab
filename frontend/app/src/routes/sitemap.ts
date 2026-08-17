import paths from './paths';
import type { RouteAudience } from 'utils/membership/audience';

export interface SubMenuItem {
  name: string;
  pathName: string;
  path: string;
  active?: boolean;
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
  active?: boolean;
  items?: SubMenuItem[];
  /** When set, the item is hidden unless the current membership includes this permission key. */
  requiredPermission?: string;
  /**
   * Which profile context may see this entry. Defaults to `staff` when omitted.
   * Permission keys narrow staff/teacher access; they never turn a staff route into a guardian route.
   */
  audience?: RouteAudience;
}

const sitemap: MenuItem[] = [
  {
    id: 'dashboard',
    subheader: 'nav.dashboard',
    path: paths.dashboard,
    icon: 'mingcute:home-1-fill',
    active: true,
    audience: 'shared',
  },
  {
    id: 'my-charges',
    subheader: 'nav.myCharges',
    path: paths.myCharges,
    icon: 'mingcute:bill-line',
    active: true,
    audience: 'guardian',
  },
  {
    id: 'students',
    subheader: 'nav.students',
    path: paths.students,
    icon: 'mingcute:school-line',
    active: true,
    audience: 'staff',
    requiredPermission: 'manage_people',
  },
  {
    id: 'guardians',
    subheader: 'nav.guardians',
    path: paths.guardians,
    icon: 'mingcute:user-2-fill',
    active: true,
    audience: 'staff',
    requiredPermission: 'manage_people',
  },
  {
    id: 'preceptorship',
    subheader: 'nav.preceptorship',
    path: paths.preceptorship,
    icon: 'mingcute:quill-pen-line',
    active: true,
    audience: 'staff',
    requiredPermission: 'teach',
  },
  {
    id: 'report-cards',
    subheader: 'nav.reportCards',
    path: paths.reportCards,
    icon: 'mingcute:report-forms-line',
    active: true,
    audience: 'staff',
    requiredPermission: 'manage_academic',
  },
  {
    id: 'my-preceptorship',
    subheader: 'nav.myPreceptorship',
    path: paths.myPreceptorship,
    icon: 'mingcute:quill-pen-line',
    active: true,
    audience: 'guardian',
  },
  {
    id: 'my-report-cards',
    subheader: 'nav.myReportCards',
    path: paths.myReportCards,
    icon: 'mingcute:report-forms-line',
    active: true,
    audience: 'guardian',
  },
  {
    id: 'my-tax-declarations',
    subheader: 'nav.myTaxDeclarations',
    path: paths.myTaxDeclarations,
    icon: 'mingcute:file-certificate-line',
    active: true,
    audience: 'guardian',
  },
  {
    id: 'requests',
    subheader: 'nav.requests',
    path: paths.requests,
    icon: 'mingcute:inbox-line',
    active: true,
    audience: 'staff',
    requiredPermission: 'manage_documents',
  },
  {
    id: 'my-requests',
    subheader: 'nav.myRequests',
    path: paths.myRequests,
    icon: 'mingcute:inbox-line',
    active: true,
    audience: 'guardian',
  },
  {
    id: 'collaborators',
    subheader: 'nav.collaborators',
    path: paths.collaborators,
    icon: 'mingcute:presentation-2-line',
    active: true,
    audience: 'staff',
  },
  {
    id: 'grades',
    subheader: 'nav.grades',
    path: paths.grades,
    icon: 'mingcute:edit-4-line',
    active: true,
    audience: 'staff',
  },
  {
    id: 'lessons',
    subheader: 'nav.lessons',
    path: paths.lessons,
    icon: 'mingcute:book-5-line',
    active: true,
    audience: 'staff',
  },
  {
    id: 'job-positions',
    subheader: 'nav.jobPositions',
    path: paths.jobPositions,
    icon: 'mingcute:idcard-line',
    active: true,
    audience: 'staff',
  },
  {
    id: 'charges',
    subheader: 'nav.charges',
    path: paths.charges,
    icon: 'mingcute:bill-line',
    active: true,
    audience: 'staff',
    requiredPermission: 'manage_billing',
  },
  {
    id: 'plans',
    subheader: 'nav.plans',
    path: paths.plans,
    icon: 'mingcute:currency-dollar-line',
    active: true,
    audience: 'staff',
    requiredPermission: 'manage_billing',
  },
  {
    id: 'billing-settings',
    subheader: 'nav.billingSettings',
    path: paths.billingSettings,
    icon: 'mingcute:settings-3-line',
    active: true,
    audience: 'staff',
    requiredPermission: 'manage_billing',
  },
  {
    id: 'service-invoices',
    subheader: 'nav.serviceInvoices',
    path: paths.serviceInvoices,
    icon: 'mingcute:file-certificate-line',
    active: true,
    audience: 'staff',
    requiredPermission: 'manage_billing',
  },
  {
    id: 'contract-template',
    subheader: 'nav.contract',
    path: paths.contractTemplate,
    icon: 'mingcute:document-2-line',
    active: true,
    audience: 'staff',
    requiredPermission: 'manage_billing',
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
  },
  {
    id: 'subjects',
    subheader: 'nav.subjects',
    path: `${paths.lessons}?tab=subjects`,
    audience: 'staff',
  },
];

export default sitemap;
