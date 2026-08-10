import { PropsWithChildren } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from 'providers/AuthContext';
import Splash from 'components/loader/Splash';
import { isBackofficeUser } from 'utils/onboarding/access';
import { redirectToSchoolSignIn } from 'utils/auth/signIn';

export const RequireBackoffice = ({ children }: PropsWithChildren) => {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <Splash />;
  }

  if (status === 'unauthenticated') {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    redirectToSchoolSignIn(returnTo);
    return <Splash />;
  }

  if (!isBackofficeUser(user?.memberships ?? [])) {
    window.location.assign('/app/');
    return <Splash />;
  }

  return children;
};
