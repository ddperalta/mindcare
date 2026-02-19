// Application constants

export const APP_NAME = 'MindCare';
export const APP_DESCRIPTION = 'Professional Mental Health Platform for Therapists';

// Session timeout (30 minutes in milliseconds)
export const SESSION_TIMEOUT = 30 * 60 * 1000;

// Roles
export const ROLES = {
  THERAPIST: 'THERAPIST',
  PATIENT: 'PATIENT',
  ADMIN: 'ADMIN',
} as const;

// Appointment statuses
export const APPOINTMENT_STATUS = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;

// Test application statuses
export const TEST_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

// Session note types
export const NOTE_TYPES = {
  SOAP: 'SOAP',
  DAP: 'DAP',
  PROGRESS: 'PROGRESS',
  INTAKE: 'INTAKE',
  DISCHARGE: 'DISCHARGE',
} as const;

// Routes
export const ROUTES = {
  // Public
  LANDING: '/',
  LOGIN: '/login',
  REGISTER: '/register',

  // Therapist
  THERAPIST_DASHBOARD: '/therapist/dashboard',
  THERAPIST_PROFILE: '/therapist/profile',
  THERAPIST_PATIENTS: '/therapist/patients',
  THERAPIST_PATIENT_DETAIL: '/therapist/patients/:id',
  THERAPIST_APPOINTMENTS: '/therapist/appointments',
  THERAPIST_SESSION_NOTES: '/therapist/notes',
  THERAPIST_TESTS: '/therapist/tests',
  THERAPIST_TEST_CREATE: '/therapist/tests/create',
  THERAPIST_TEST_ASSIGN: '/therapist/tests/:testId/assign',
  THERAPIST_TEST_RESULTS: '/therapist/tests/:testId/results',
  THERAPIST_TEST_EDIT: '/therapist/tests/:testId/edit',

  // Patient
  PATIENT_DASHBOARD: '/patient/dashboard',
  PATIENT_PROFILE: '/patient/profile',
  PATIENT_APPOINTMENTS: '/patient/appointments',
  PATIENT_TESTS: '/patient/tests',
  PATIENT_TAKE_TEST: '/patient/tests/:assignmentId/take',
  PATIENT_RECORDS: '/patient/records',

  // Admin
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_THERAPIST_VERIFICATION: '/admin/therapists',
  ADMIN_TEST_TEMPLATES: '/admin/templates',
  ADMIN_TEMPLATE_CREATE: '/admin/templates/create',
  ADMIN_TEMPLATE_EDIT: '/admin/templates/:templateId/edit',
} as const;
