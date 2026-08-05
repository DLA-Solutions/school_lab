export const rootPaths = {
  root: '/',
  authRoot: 'authentication',
  errorRoot: 'error',
};

export default {
  dashboard: rootPaths.root,

  signin: `/${rootPaths.authRoot}/signin`,

  404: `/${rootPaths.errorRoot}/404`,
};
