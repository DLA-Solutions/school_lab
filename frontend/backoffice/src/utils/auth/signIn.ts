/** School SPA hosts the shared sign-in UI (ADR 001). */
export const schoolAppSignInPath = '/app/authentication/signin';

export const redirectToSchoolSignIn = (returnTo?: string) => {
  const url = new URL(schoolAppSignInPath, window.location.origin);

  if (returnTo) {
    url.searchParams.set('return_to', returnTo);
  }

  window.location.assign(url.toString());
};
