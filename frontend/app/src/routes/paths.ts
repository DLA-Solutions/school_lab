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

  preceptorship: `/${rootPaths.academicsRoot}/preceptoria`,
  myPreceptorship: '/preceptoria',
  reportCards: `/${rootPaths.academicsRoot}/boletins`,
  myReportCards: '/boletins',

  requests: '/solicitacoes',
  // The guardian's own side of the same queue, on its own address: the two are different jobs
  // and sharing a path would mean one screen deciding which it is on every render.
  myRequests: '/meus-pedidos',
  myCharges: '/meus-boletos',
  myHealthRecords: '/ficha-de-saude',
  myTaxDeclarations: '/imposto-de-renda',

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
