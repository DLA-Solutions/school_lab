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
import {
  RequireAuth,
  RequireGuest,
  RequireOwnerOnboardingComplete,
  RequireRouteAudience,
  RequireRouteModule,
  RequireSchoolOwner,
  RequireTeacherRole,
} from './guards';

// Vite `base` uses a trailing slash (/app/); React Router `basename` must not — otherwise
// visiting /app (no slash) fails to match and the router renders nothing.
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

const App = lazy(() => import('App'));
const Dashboard = lazy(() => import('pages/Dashboard'));
const GuardianAccess = lazy(() => import('pages/authentication/GuardianAccess'));
const ForgotPassword = lazy(() => import('pages/authentication/ForgotPassword'));
const ResetPassword = lazy(() => import('pages/authentication/ResetPassword'));
const Guardians = lazy(() => import('pages/people/Guardians'));
const Users = lazy(() => import('pages/people/Users'));
const Students = lazy(() => import('pages/people/Students'));
const Collaborators = lazy(() => import('pages/academics/Collaborators'));
const Grades = lazy(() => import('pages/academics/Grades'));
const LessonPlans = lazy(() => import('pages/academics/LessonPlans'));
const AllLessonPlans = lazy(() => import('pages/academics/AllLessonPlans'));
const Atas = lazy(() => import('pages/academics/Atas'));
const DailyRoutine = lazy(() => import('pages/academics/DailyRoutine'));
const Lessons = lazy(() => import('pages/academics/Lessons'));
const SchoolClasses = lazy(() => import('pages/academics/SchoolClasses'));
const Subjects = lazy(() => import('pages/academics/Subjects'));
const JobPositions = lazy(() => import('pages/academics/JobPositions'));
const MyHealthProfile = lazy(() => import('pages/academics/MyHealthProfile'));
const Preceptorship = lazy(() => import('pages/preceptorship/Preceptorship'));
const MyPreceptorship = lazy(() => import('pages/preceptorship/MyPreceptorship'));
const ReportCards = lazy(() => import('pages/report-cards/ReportCards'));
const MyReportCards = lazy(() => import('pages/report-cards/MyReportCards'));
const Requests = lazy(() => import('pages/requests/Requests'));
const MyRequests = lazy(() => import('pages/requests/MyRequests'));
const Charges = lazy(() => import('pages/billing/Charges'));
const Plans = lazy(() => import('pages/billing/Plans'));
const BillingSettings = lazy(() => import('pages/billing/BillingSettings'));
const ServiceInvoices = lazy(() => import('pages/billing/ServiceInvoices'));
const ContractTemplatePage = lazy(() => import('pages/billing/ContractTemplatePage'));
const PlatformSubscriptionPage = lazy(() => import('pages/subscription/PlatformSubscription'));
const SignatureCredentialsPage = lazy(() => import('pages/settings/SignatureCredentials'));
const MyTaxDeclarations = lazy(() => import('pages/billing/MyTaxDeclarations'));
const MyCharges = lazy(() => import('pages/billing/MyCharges'));
const MyHealthRecords = lazy(() => import('pages/people/MyHealthRecords'));
const MyAuthorizedPickups = lazy(() => import('pages/people/MyAuthorizedPickups'));
const MyAtas = lazy(() => import('pages/academics/MyAtas'));

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
              <RequireRouteAudience>
                <RequireRouteModule>
                  <MainLayout>
                    <Suspense fallback={<PageLoader />}>
                      <Outlet />
                    </Suspense>
                  </MainLayout>
                </RequireRouteModule>
              </RequireRouteAudience>
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
              path: paths.users,
              element: <Users />,
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
              path: paths.lessons,
              element: <Lessons />,
            },
            {
              path: paths.grades,
              element: <Grades />,
            },
            {
              path: paths.lessonPlans,
              element: <LessonPlans />,
            },
            {
              path: paths.allLessonPlans,
              element: <AllLessonPlans />,
            },
            {
              path: paths.atas,
              element: <Atas />,
            },
            {
              path: paths.dailyRoutine,
              element: <DailyRoutine />,
            },
            {
              // Kept at its own address though it left the menu: it is a tab inside Aulas now, and
              // an existing link to a class listing should still land somewhere.
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
              // Owner-only-style guard (BC6): a hidden nav entry is not an access rule, so a
              // non-teacher staff member landing on this URL is bounced rather than shown a page
              // that can never resolve a profile for them.
              path: paths.myHealthProfile,
              element: (
                <RequireTeacherRole>
                  <MyHealthProfile />
                </RequireTeacherRole>
              ),
            },
            {
              path: paths.preceptorship,
              element: <Preceptorship />,
            },
            {
              path: paths.reportCards,
              element: <ReportCards />,
            },
            {
              path: paths.myPreceptorship,
              element: <MyPreceptorship />,
            },
            {
              path: paths.myReportCards,
              element: <MyReportCards />,
            },
            {
              path: paths.requests,
              element: <Requests />,
            },
            {
              path: paths.myRequests,
              element: <MyRequests />,
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
              path: paths.serviceInvoices,
              element: <ServiceInvoices />,
            },
            {
              path: paths.contractTemplate,
              element: <ContractTemplatePage />,
            },
            {
              path: paths.platformSubscription,
              element: <PlatformSubscriptionPage />,
            },
            {
              // Owner-only: the token creates documents in the school's name, so the guard is
              // here as well as on the nav entry — a hidden link is not an access rule.
              path: paths.signatureCredentials,
              element: (
                <RequireSchoolOwner>
                  <SignatureCredentialsPage />
                </RequireSchoolOwner>
              ),
            },
            {
              path: paths.myTaxDeclarations,
              element: <MyTaxDeclarations />,
            },
            {
              path: paths.myCharges,
              element: <MyCharges />,
            },
            {
              path: paths.myHealthRecords,
              element: <MyHealthRecords />,
            },
            {
              path: paths.myPickups,
              element: <MyAuthorizedPickups />,
            },
            {
              path: paths.myAtas,
              element: <MyAtas />,
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
          // Reached from an e-mail by someone who cannot sign in, so no guard: `RequireGuest` would
          // bounce a signed-in parent trying to reset the password they had just forgotten.
          element: (
            <AuthLayout>
              <Outlet />
            </AuthLayout>
          ),
          children: [
            {
              path: paths.guardianAccess,
              element: <GuardianAccess />,
            },
            {
              path: paths.forgotPassword,
              element: <ForgotPassword />,
            },
            {
              path: paths.resetPassword,
              element: <ResetPassword />,
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
