import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from 'providers/AuthContext';
import Splash from 'components/loader/Splash';
import { onboardingRedirectPath } from 'utils/onboarding/access';
import { postLoginDestination } from 'utils/auth/postLogin';
import paths from './paths';

export const RequireAuth = ({ children }: PropsWithChildren) => {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <Splash />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to={paths.signin} state={{ from: location.pathname }} replace />;
  }

  const onboardingRedirect = onboardingRedirectPath(user, location.pathname);
  if (onboardingRedirect) {
    return <Navigate to={onboardingRedirect} replace />;
  }

  return children;
};

export const RequireGuest = ({ children }: PropsWithChildren) => {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return <Splash />;
  }

  if (status === 'authenticated' && user) {
    const destination = postLoginDestination(user);

    if (destination.kind === 'external') {
      window.location.assign(destination.url);
      return <Splash />;
    }

    return <Navigate to={destination.path} replace />;
  }

  return children;
};

/** Blocks main app routes until owner finishes pending-handoff wizard (#198). */
export const RequireOwnerOnboardingComplete = ({ children }: PropsWithChildren) => {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <Splash />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to={paths.signin} state={{ from: location.pathname }} replace />;
  }

  const onboardingRedirect = onboardingRedirectPath(user, location.pathname);
  if (onboardingRedirect && onboardingRedirect !== paths.ownerOnboarding) {
    return <Navigate to={onboardingRedirect} replace />;
  }

  return children;
};
