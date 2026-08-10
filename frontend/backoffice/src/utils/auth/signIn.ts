/** School SPA hosts the shared sign-in UI (ADR 001). */
export const schoolAppSignInPath = '/app/authentication/signin';

/**
 * React Router `location` paths omit the Vite basename (`/backoffice`).
 * Sign-in `return_to` must be the browser path so post-login can send operators back here.
 */
export const buildReturnToPath = (
  pathname: string,
  search: string,
  hash: string,
  basePath = import.meta.env.BASE_URL.replace(/\/$/, ''),
): string => {
  const relativePath = `${pathname}${search}${hash}`;

  if (!basePath || basePath === '/') {
    return relativePath;
  }

  if (relativePath === '/' || relativePath === '') {
    return `${basePath}/`;
  }

  return `${basePath}${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`;
};

export const redirectToSchoolSignIn = (returnTo?: string) => {
  const url = new URL(schoolAppSignInPath, window.location.origin);

  if (returnTo) {
    url.searchParams.set('return_to', returnTo);
  }

  window.location.assign(url.toString());
};
