import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from 'providers/AuthContext';
import { useActiveMembership } from 'providers/ActiveMembershipContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import Splash from 'components/loader/Splash';
import { onboardingRedirectPath } from 'utils/onboarding/access';
import { postLoginDestination } from 'utils/auth/postLogin';
import { membershipAudience } from 'utils/membership/audience';
import {
  isModuleEnabledForMembership,
  routeAudienceForPath,
  routeModuleKeyForPath,
} from 'utils/navigation/visibleSitemap';
import paths from './paths';

/** Blocks owner-only flows (permission overrides) from non-owners hitting the URL directly. */
export const RequireSchoolOwner = ({ children }: PropsWithChildren) => {
  const { status } = useAuth();
  const school = useCurrentSchool();
  const location = useLocation();

  if (status === 'loading') {
    return <Splash />;
  }

  if (!school?.is_owner) {
    return <Navigate to={paths.users} state={{ from: location.pathname }} replace />;
  }

  return children;
};

/**
 * Blocks the collaborator's own health profile (BC6) from staff who are not a `teacher` —
 * a hidden menu entry is not an access rule on its own, same reasoning as `RequireSchoolOwner`.
 * The API enforces the real boundary (own-profile-by-email-match); this only keeps a non-teacher
 * staff member from landing on a page that can never resolve a profile for them.
 */
export const RequireTeacherRole = ({ children }: PropsWithChildren) => {
  const { status } = useAuth();
  const membership = useActiveMembership();
  const location = useLocation();

  if (status === 'loading') {
    return <Splash />;
  }

  if (membership?.role !== 'teacher') {
    return <Navigate to={paths.dashboard} state={{ from: location.pathname }} replace />;
  }

  return children;
};

/** Redirects deep-links to module-gated routes when the school module is disabled. */
export const RequireRouteModule = ({ children }: PropsWithChildren) => {
  const { status } = useAuth();
  const membership = useActiveMembership();
  const location = useLocation();

  if (status === 'loading') {
    return <Splash />;
  }

  const moduleKey = routeModuleKeyForPath(location.pathname);
  if (moduleKey && !isModuleEnabledForMembership(membership, moduleKey)) {
    return <Navigate to={paths.dashboard} replace />;
  }

  return children;
};

/** Redirects deep-links to routes that belong to another active profile context. */
export const RequireRouteAudience = ({ children }: PropsWithChildren) => {
  const { status } = useAuth();
  const membership = useActiveMembership();
  const location = useLocation();

  if (status === 'loading') {
    return <Splash />;
  }

  const routeAudience = routeAudienceForPath(location.pathname);

  if (routeAudience && routeAudience !== 'shared' && membership) {
    const activeAudience = membershipAudience(membership);

    if (routeAudience !== activeAudience) {
      return <Navigate to={paths.dashboard} replace />;
    }
  }

  return children;
};

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
