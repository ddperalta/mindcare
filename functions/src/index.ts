import * as admin from 'firebase-admin';

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export all functions

// Auth functions
export { setCustomClaims, onUserCreated, addPatientRelationship } from './auth/setCustomClaims';

// Admin functions
export { createTherapistUser } from './admin/createTherapistUser';
export { createUserInvitation } from './admin/createUserInvitation';
export { adminUpdateUser } from './admin/adminUpdateUser';

// Therapist functions
export { createTherapistFromInvitation } from './therapists/createTherapistFromInvitation';

// Patient invitation functions
export { createPatientInvitation } from './patients/createPatientInvitation';
export { validateInvitation } from './patients/validateInvitation';
export { createPatientFromInvitation } from './patients/createPatientFromInvitation';
export { transferPatient } from './patients/transferPatient';
