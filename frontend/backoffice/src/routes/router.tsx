import { Suspense, lazy } from 'react';
import { Outlet, createBrowserRouter, Navigate } from 'react-router';
import Splash from 'components/loader/Splash';
import PageLoader from 'components/loader/PageLoader';
import BackofficeLayout from 'layouts/BackofficeLayout';
import { RequireBackoffice } from './guards';
import paths from './paths';

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

const App = lazy(() => import('App'));
const Schools = lazy(() => import('pages/schools/Schools'));
const ProvisioningWizard = lazy(() => import('pages/schools/ProvisioningWizard'));

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
              <BackofficeLayout>
                <Suspense fallback={<PageLoader />}>
                  <Outlet />
                </Suspense>
              </BackofficeLayout>
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
          ],
        },
      ],
    },
  ],
  { basename: routerBasename },
);

export default router;
