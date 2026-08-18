import { SchoolOnboardingStatus } from 'types/onboarding';

export default {
  dashboard: '/',
  dashboardAlias: '/dashboard',
  schools: '/schools',
  users: '/users',
  audits: '/audits',
  schoolGroups: '/school-groups',
  subscriptions: '/subscriptions',
  analytics: '/analytics',
  helpTaxonomy: '/help-taxonomy',
  schoolsWithOnboardingStatus: (status: SchoolOnboardingStatus) =>
    `/schools?onboarding_status=${status}`,
  provisioningWizard: (schoolId: number) => `/schools/${schoolId}/provisioning`,
  schoolDetail: (schoolId: number) => `/schools/${schoolId}`,
  schoolActivation: (schoolId: number) => `/schools/${schoolId}/activation`,
  bankCredentials: (schoolId: number) => `/schools/${schoolId}/bank-credentials`,
};
