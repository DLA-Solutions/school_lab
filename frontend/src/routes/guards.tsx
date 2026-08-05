import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from 'providers/AuthContext';
import Splash from 'components/loader/Splash';
import paths, { rootPaths } from './paths';

export const RequireAuth = ({ children }: PropsWithChildren) => {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <Splash />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to={paths.signin} state={{ from: location.pathname }} replace />;
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
