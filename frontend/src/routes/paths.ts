export const rootPaths = {
  root: '/',
  peopleRoot: 'pessoas',
  academicsRoot: 'academico',
  authRoot: 'authentication',
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

  contractTemplate: '/contrato',

  schools: '/escolas',

  signin: `/${rootPaths.authRoot}/signin`,

  404: `/${rootPaths.errorRoot}/404`,
};
