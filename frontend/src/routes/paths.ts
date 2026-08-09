export const rootPaths = {
  root: '/',
  peopleRoot: 'pessoas',
  authRoot: 'authentication',
  errorRoot: 'error',
};

export default {
  dashboard: rootPaths.root,

  guardians: `/${rootPaths.peopleRoot}/responsaveis`,

  signin: `/${rootPaths.authRoot}/signin`,

  404: `/${rootPaths.errorRoot}/404`,
};
