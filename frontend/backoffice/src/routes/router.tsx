import { Suspense, lazy } from 'react';
import { Outlet, createBrowserRouter, Navigate } from 'react-router';
import Splash from 'components/loader/Splash';
import PageLoader from 'components/loader/PageLoader';
import MainLayout from 'layouts/main-layout';
import Error404 from 'pages/Error404';
import { RequireBackoffice } from './guards';
import paths from './paths';

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

const App = lazy(() => import('App'));
const Schools = lazy(() => import('pages/schools/Schools'));
const ProvisioningWizard = lazy(() => import('pages/schools/ProvisioningWizard'));
const SchoolActivation = lazy(() => import('pages/schools/SchoolActivation'));

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
              element: <Navigate to={paths.schools} replace />,
            },
            {
              path: paths.schools,
              element: <Schools />,
            },
            {
              path: 'schools/:schoolId/provisioning',
              element: <ProvisioningWizard />,
            },
            {
              path: 'schools/:schoolId/activation',
              element: <SchoolActivation />,
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
