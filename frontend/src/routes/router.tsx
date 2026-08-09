import { Suspense, lazy } from 'react';
import { Outlet, createBrowserRouter } from 'react-router';
import paths, { rootPaths } from './paths';
import MainLayout from 'layouts/main-layout';
import AuthLayout from 'layouts/auth-layout';
import Splash from 'components/loader/Splash';
import PageLoader from 'components/loader/PageLoader';
import Signin from 'pages/authentication/Signin';
import Error404 from 'pages/Error404';
import { RequireAuth, RequireGuest } from './guards';

// Vite `base` uses a trailing slash (/app/); React Router `basename` must not — otherwise
// visiting /app (no slash) fails to match and the router renders nothing.
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

const App = lazy(() => import('App'));
const Dashboard = lazy(() => import('pages/Dashboard'));
const Guardians = lazy(() => import('pages/people/Guardians'));
const Students = lazy(() => import('pages/people/Students'));
const Teachers = lazy(() => import('pages/academics/Teachers'));
const SchoolClasses = lazy(() => import('pages/academics/SchoolClasses'));
const Subjects = lazy(() => import('pages/academics/Subjects'));
const Schools = lazy(() => import('pages/Schools'));

const router = createBrowserRouter(
  [
  {
    element: (
      <Suspense fallback={<Splash />}>
        <App />
      </Suspense>
    ),
    children: [
      {
        path: rootPaths.root,
        element: (
          <RequireAuth>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </MainLayout>
          </RequireAuth>
        ),
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
          {
            path: paths.guardians,
            element: <Guardians />,
          },
          {
            path: paths.students,
            element: <Students />,
          },
          {
            path: paths.teachers,
            element: <Teachers />,
          },
          {
            path: paths.schoolClasses,
            element: <SchoolClasses />,
          },
          {
            path: paths.subjects,
            element: <Subjects />,
          },
          {
            path: paths.schools,
            element: <Schools />,
          },
        ],
      },
      {
        path: rootPaths.authRoot,
        element: (
          <RequireGuest>
            <AuthLayout>
              <Outlet />
            </AuthLayout>
          </RequireGuest>
        ),
        children: [
          {
            path: paths.signin,
            element: <Signin />,
          },
        ],
      },
      {
        path: '*',
        element: <Error404 />,
      },
    ],
  },
  ],
  { basename: routerBasename },
);

export default router;
