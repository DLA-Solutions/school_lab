export default {
  schools: '/schools',
  users: '/users',
  provisioningWizard: (schoolId: number) => `/schools/${schoolId}/provisioning`,
  schoolActivation: (schoolId: number) => `/schools/${schoolId}/activation`,
};
