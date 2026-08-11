import { SchoolOnboardingStatus } from 'types/onboarding';

export default {
  dashboard: '/',
  dashboardAlias: '/dashboard',
  schools: '/schools',
  users: '/users',
  schoolsWithOnboardingStatus: (status: SchoolOnboardingStatus) =>
    `/schools?onboarding_status=${status}`,
  provisioningWizard: (schoolId: number) => `/schools/${schoolId}/provisioning`,
  schoolActivation: (schoolId: number) => `/schools/${schoolId}/activation`,
};
