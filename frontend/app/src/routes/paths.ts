export const rootPaths = {
  root: '/',
  peopleRoot: 'pessoas',
  academicsRoot: 'academico',
  authRoot: 'authentication',
  onboardingRoot: 'onboarding',
  inviteRoot: 'invite',
  errorRoot: 'error',
};

export default {
  dashboard: rootPaths.root,

  guardians: `/${rootPaths.peopleRoot}/responsaveis`,
  students: `/${rootPaths.peopleRoot}/estudantes`,
  team: `/${rootPaths.peopleRoot}/equipe`,

  collaborators: `/${rootPaths.academicsRoot}/colaboradores`,
  lessons: `/${rootPaths.academicsRoot}/aulas`,
  grades: `/${rootPaths.academicsRoot}/notas`,
  schoolClasses: `/${rootPaths.academicsRoot}/turmas`,
  subjects: `/${rootPaths.academicsRoot}/materias`,
  jobPositions: `/${rootPaths.academicsRoot}/cargos`,

  charges: '/boletos',
  plans: '/planos',
  billingSettings: '/financeiro/configuracoes',
  contractTemplate: '/contrato',

  signin: `/${rootPaths.authRoot}/signin`,
  // Top-level and public: these are the addresses the invitation and reset e-mails point at, and
  // `SchoolLab::SchoolSpa` builds the same two on the server.
  guardianAccess: '/acesso',
  forgotPassword: '/esqueci-senha',
  resetPassword: '/redefinir-senha',

  inviteAccept: `/${rootPaths.inviteRoot}/accept`,
  ownerOnboarding: `/${rootPaths.onboardingRoot}/owner`,

  404: `/${rootPaths.errorRoot}/404`,
};
