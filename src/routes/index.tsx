import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { ROUTES } from '../config/constants';

// Lazy load all route components for code splitting
const Login = lazy(() => import('../pages/public/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('../pages/public/Register').then(m => ({ default: m.Register })));
const TherapistDashboard = lazy(() => import('../pages/therapist/Dashboard').then(m => ({ default: m.TherapistDashboard })));
const TherapistProfile = lazy(() => import('../pages/therapist/Profile').then(m => ({ default: m.TherapistProfile })));
const Patients = lazy(() => import('../pages/therapist/Patients').then(m => ({ default: m.Patients })));
const Tests = lazy(() => import('../pages/therapist/Tests').then(m => ({ default: m.Tests })));
const TestCreator = lazy(() => import('../pages/therapist/TestCreator').then(m => ({ default: m.TestCreator })));
const TestAssign = lazy(() => import('../pages/therapist/TestAssign').then(m => ({ default: m.TestAssign })));
const TestResults = lazy(() => import('../pages/therapist/TestResults').then(m => ({ default: m.TestResults })));
const TestEditor = lazy(() => import('../pages/therapist/TestEditor').then(m => ({ default: m.TestEditor })));
const PatientDetail = lazy(() => import('../pages/therapist/PatientDetail').then(m => ({ default: m.PatientDetail })));
const PatientDashboard = lazy(() => import('../pages/patient/Dashboard').then(m => ({ default: m.PatientDashboard })));
const PatientProfile = lazy(() => import('../pages/patient/Profile').then(m => ({ default: m.PatientProfile })));
const PatientTests = lazy(() => import('../pages/patient/Tests').then(m => ({ default: m.PatientTests })));
const TakeTest = lazy(() => import('../pages/patient/TakeTest').then(m => ({ default: m.TakeTest })));
const TherapistAppointments = lazy(() => import('../pages/therapist/Appointments').then(m => ({ default: m.TherapistAppointments })));
const PatientAppointments = lazy(() => import('../pages/patient/Appointments').then(m => ({ default: m.PatientAppointments })));
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })));
const AdminTestTemplates = lazy(() => import('../pages/admin/TestTemplates').then(m => ({ default: m.AdminTestTemplates })));
const TemplateCreator = lazy(() => import('../pages/admin/TemplateCreator').then(m => ({ default: m.TemplateCreator })));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sage-50">
      <div className="flex flex-col items-center space-y-4">
        <svg
          className="animate-spin h-12 w-12 text-teal-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-sage-700 font-semibold">Cargando...</p>
      </div>
    </div>
  );
}

export function AppRoutes() {
  const { currentUser, customClaims } = useAuth();

  // Redirect authenticated users from root to their dashboard
  const HomeRedirect = () => {
    if (!currentUser) {
      return <Navigate to={ROUTES.LOGIN} replace />;
    }

    const role = customClaims?.role;
    if (role === 'THERAPIST') {
      return <Navigate to={ROUTES.THERAPIST_DASHBOARD} replace />;
    }
    if (role === 'PATIENT') {
      return <Navigate to={ROUTES.PATIENT_DASHBOARD} replace />;
    }
    if (role === 'ADMIN') {
      return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
    }

    return <Navigate to={ROUTES.LOGIN} replace />;
  };

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path={ROUTES.LANDING} element={<HomeRedirect />} />
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.REGISTER} element={<Register />} />

        {/* Therapist routes */}
        <Route
          path={ROUTES.THERAPIST_DASHBOARD}
          element={
            <ProtectedRoute allowedRoles={['THERAPIST']}>
              <TherapistDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.THERAPIST_PROFILE}
          element={
            <ProtectedRoute allowedRoles={['THERAPIST']}>
              <TherapistProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.THERAPIST_PATIENTS}
          element={
            <ProtectedRoute allowedRoles={['THERAPIST']}>
              <Patients />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.THERAPIST_TESTS}
          element={
            <ProtectedRoute allowedRoles={['THERAPIST']}>
              <Tests />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.THERAPIST_TEST_CREATE}
          element={
            <ProtectedRoute allowedRoles={['THERAPIST']}>
              <TestCreator />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.THERAPIST_TEST_ASSIGN}
          element={
            <ProtectedRoute allowedRoles={['THERAPIST']}>
              <TestAssign />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.THERAPIST_TEST_RESULTS}
          element={
            <ProtectedRoute allowedRoles={['THERAPIST']}>
              <TestResults />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.THERAPIST_TEST_EDIT}
          element={
            <ProtectedRoute allowedRoles={['THERAPIST']}>
              <TestEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.THERAPIST_PATIENT_DETAIL}
          element={
            <ProtectedRoute allowedRoles={['THERAPIST']}>
              <PatientDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.THERAPIST_APPOINTMENTS}
          element={
            <ProtectedRoute allowedRoles={['THERAPIST']}>
              <TherapistAppointments />
            </ProtectedRoute>
          }
        />

        {/* Patient routes */}
        <Route
          path={ROUTES.PATIENT_DASHBOARD}
          element={
            <ProtectedRoute allowedRoles={['PATIENT']}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.PATIENT_PROFILE}
          element={
            <ProtectedRoute allowedRoles={['PATIENT']}>
              <PatientProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.PATIENT_TESTS}
          element={
            <ProtectedRoute allowedRoles={['PATIENT']}>
              <PatientTests />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.PATIENT_TAKE_TEST}
          element={
            <ProtectedRoute allowedRoles={['PATIENT']}>
              <TakeTest />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.PATIENT_APPOINTMENTS}
          element={
            <ProtectedRoute allowedRoles={['PATIENT']}>
              <PatientAppointments />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path={ROUTES.ADMIN_DASHBOARD}
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN_TEST_TEMPLATES}
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminTestTemplates />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN_TEMPLATE_CREATE}
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <TemplateCreator />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN_TEMPLATE_EDIT}
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <TemplateCreator />
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to={ROUTES.LANDING} replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
