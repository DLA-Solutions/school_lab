import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from 'providers/AuthContext';
import Splash from 'components/loader/Splash';
import { onboardingRedirectPath } from 'utils/onboarding/access';
import paths, { rootPaths } from './paths';

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
  const { status } = useAuth();

  if (status === 'loading') {
    return <Splash />;
  }

  if (status === 'authenticated') {
    return <Navigate to={rootPaths.root} replace />;
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
