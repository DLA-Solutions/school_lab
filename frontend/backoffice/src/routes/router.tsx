import { Suspense, lazy } from 'react';
import { Outlet, createBrowserRouter } from 'react-router';
import Splash from 'components/loader/Splash';
import PageLoader from 'components/loader/PageLoader';
import MainLayout from 'layouts/main-layout';
import Error404 from 'pages/Error404';
import { RequireBackoffice } from './guards';
import paths from './paths';

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

const App = lazy(() => import('App'));
const Dashboard = lazy(() => import('pages/Dashboard'));
const Schools = lazy(() => import('pages/schools/Schools'));
const Users = lazy(() => import('pages/users/Users'));
const Audits = lazy(() => import('pages/audits/Audits'));
const SchoolGroups = lazy(() => import('pages/school-groups/SchoolGroups'));
const Subscriptions = lazy(() => import('pages/subscriptions/Subscriptions'));
const Analytics = lazy(() => import('pages/analytics/Analytics'));
const HelpTaxonomy = lazy(() => import('pages/help-taxonomy/HelpTaxonomy'));
const ProvisioningWizard = lazy(() => import('pages/schools/ProvisioningWizard'));
const SchoolDetail = lazy(() => import('pages/schools/SchoolDetail'));
const SchoolActivation = lazy(() => import('pages/schools/SchoolActivation'));
const BankCredentials = lazy(() => import('pages/schools/BankCredentials'));
const SignatureCredentials = lazy(() => import('pages/schools/SignatureCredentials'));

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
          path: '/',
          element: (
            <RequireBackoffice>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <Outlet />
                </Suspense>
              </MainLayout>
            </RequireBackoffice>
          ),
          children: [
            {
              index: true,
              element: <Dashboard />,
            },
            {
              path: paths.dashboardAlias.slice(1),
              element: <Dashboard />,
            },
            {
              path: paths.schools.slice(1),
              element: <Schools />,
            },
            {
              path: paths.users.slice(1),
              element: <Users />,
            },
            {
              path: paths.audits.slice(1),
              element: <Audits />,
            },
            {
              path: paths.schoolGroups.slice(1),
              element: <SchoolGroups />,
            },
            {
              path: paths.subscriptions.slice(1),
              element: <Subscriptions />,
            },
            {
              path: paths.analytics.slice(1),
              element: <Analytics />,
            },
            {
              path: paths.helpTaxonomy.slice(1),
              element: <HelpTaxonomy />,
            },
            {
              path: 'schools/:schoolId/provisioning',
              element: <ProvisioningWizard />,
            },
            {
              path: 'schools/:schoolId/activation',
              element: <SchoolActivation />,
            },
            {
              path: 'schools/:schoolId/bank-credentials',
              element: <BankCredentials />,
            },
            {
              path: 'schools/:schoolId/signature-credentials',
              element: <SignatureCredentials />,
            },
            {
              path: 'schools/:schoolId',
              element: <SchoolDetail />,
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
