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

  collaborators: `/${rootPaths.academicsRoot}/colaboradores`,
  schoolClasses: `/${rootPaths.academicsRoot}/turmas`,
  subjects: `/${rootPaths.academicsRoot}/materias`,
  jobPositions: `/${rootPaths.academicsRoot}/cargos`,

  charges: '/boletos',
  plans: '/planos',
  contractTemplate: '/contrato',

  schools: '/escolas',

  signin: `/${rootPaths.authRoot}/signin`,

  inviteAccept: `/${rootPaths.inviteRoot}/accept`,
  ownerOnboarding: `/${rootPaths.onboardingRoot}/owner`,

  404: `/${rootPaths.errorRoot}/404`,
};
