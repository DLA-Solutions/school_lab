export default {
  schools: '/schools',
  provisioningWizard: (schoolId: number) => `/schools/${schoolId}/provisioning`,
  schoolActivation: (schoolId: number) => `/schools/${schoolId}/activation`,
};
