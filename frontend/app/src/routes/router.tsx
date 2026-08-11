import { Suspense, lazy } from 'react';
import { Outlet, createBrowserRouter } from 'react-router';
import paths, { rootPaths } from './paths';
import MainLayout from 'layouts/main-layout';
import AuthLayout from 'layouts/auth-layout';
import Splash from 'components/loader/Splash';
import PageLoader from 'components/loader/PageLoader';
import Signin from 'pages/authentication/Signin';
import InviteAccept from 'pages/onboarding/InviteAccept';
import OwnerOnboarding from 'pages/onboarding/OwnerOnboarding';
import Error404 from 'pages/Error404';
import { RequireAuth, RequireGuest, RequireOwnerOnboardingComplete } from './guards';

// Vite `base` uses a trailing slash (/app/); React Router `basename` must not — otherwise
// visiting /app (no slash) fails to match and the router renders nothing.
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

const App = lazy(() => import('App'));
const Dashboard = lazy(() => import('pages/Dashboard'));
const Guardians = lazy(() => import('pages/people/Guardians'));
const Team = lazy(() => import('pages/people/Team'));
const Students = lazy(() => import('pages/people/Students'));
const Collaborators = lazy(() => import('pages/academics/Collaborators'));
const SchoolClasses = lazy(() => import('pages/academics/SchoolClasses'));
const Subjects = lazy(() => import('pages/academics/Subjects'));
const JobPositions = lazy(() => import('pages/academics/JobPositions'));
const Charges = lazy(() => import('pages/billing/Charges'));
const Plans = lazy(() => import('pages/billing/Plans'));
const BillingSettings = lazy(() => import('pages/billing/BillingSettings'));
const ContractTemplatePage = lazy(() => import('pages/billing/ContractTemplatePage'));

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
            path: paths.team,
            element: <Team />,
          },
          {
            path: paths.students,
            element: <Students />,
          },
          {
            path: paths.collaborators,
            element: <Collaborators />,
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
            path: paths.jobPositions,
            element: <JobPositions />,
          },
          {
            path: paths.charges,
            element: <Charges />,
          },
          {
            path: paths.plans,
            element: <Plans />,
          },
          {
            path: paths.billingSettings,
            element: <BillingSettings />,
          },
          {
            path: paths.contractTemplate,
            element: <ContractTemplatePage />,
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
        path: rootPaths.inviteRoot,
        element: (
          <AuthLayout>
            <Outlet />
          </AuthLayout>
        ),
        children: [
          {
            path: 'accept',
            element: <InviteAccept />,
          },
        ],
      },
      {
        path: rootPaths.onboardingRoot,
        element: (
          <RequireOwnerOnboardingComplete>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </MainLayout>
          </RequireOwnerOnboardingComplete>
        ),
        children: [
          {
            path: 'owner',
            element: <OwnerOnboarding />,
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
