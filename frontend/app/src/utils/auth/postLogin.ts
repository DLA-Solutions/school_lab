import { AuthUser } from 'types/auth';
import { isBackofficeUser } from 'utils/onboarding/access';

export type PostLoginDestination =
  | { kind: 'external'; url: string }
  | { kind: 'internal'; path: string };

/**
 * After sign-in, backoffice operators land on `/backoffice/`; school users stay in this SPA.
 * Honors `return_to` when it targets the platform SPA (cross-app redirect from backoffice guard).
 */
export const postLoginDestination = (
  user: AuthUser,
  returnTo?: string | null,
): PostLoginDestination => {
  const trimmed = returnTo?.trim();

  if (trimmed?.startsWith('/backoffice')) {
    return { kind: 'external', url: trimmed };
  }

  if (isBackofficeUser(user.memberships)) {
    return { kind: 'external', url: '/backoffice/' };
  }

  return { kind: 'internal', path: trimmed && !trimmed.startsWith('/backoffice') ? trimmed : '/' };
};

export const applyPostLoginDestination = (
  destination: PostLoginDestination,
  navigate: (path: string, options?: { replace?: boolean }) => void,
) => {
  if (destination.kind === 'external') {
    window.location.assign(destination.url);
    return;
  }

  navigate(destination.path, { replace: true });
};
