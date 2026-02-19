import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface CreatePatientRequest {
  token: string;
  displayName: string;
  password: string;
}

export const createPatientFromInvitation = functions.https.onCall(
  async (data: CreatePatientRequest, context) => {
    const { token, displayName, password } = data;

    // Validation
    if (!token || !displayName || !password) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: token, displayName, password'
      );
    }

    if (password.length < 6) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Password must be at least 6 characters'
      );
    }

    try {
      const db = admin.firestore();

      // Try patient_invitations first (therapist-created)
      let invitationDoc = await db.collection('patient_invitations').doc(token).get();
      let invitationType: 'patient' | 'user' = 'patient';

      // If not found, try user_invitations (admin-created)
      if (!invitationDoc.exists) {
        invitationDoc = await db.collection('user_invitations').doc(token).get();
        invitationType = 'user';
      }

      if (!invitationDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Invalid invitation token'
        );
      }

      const invitation = invitationDoc.data()!;

      // For user_invitations, verify role is PATIENT
      if (invitationType === 'user' && invitation.role !== 'PATIENT') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'This invitation is not for a patient account'
        );
      }

      // Check status
      if (invitation.status !== 'PENDING') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Invitation has already been used or cancelled'
        );
      }

      // Check expiration
      const now = admin.firestore.Timestamp.now();
      if (invitation.expiresAt.toMillis() < now.toMillis()) {
        await invitationDoc.ref.update({ status: 'EXPIRED' });
        throw new functions.https.HttpsError(
          'deadline-exceeded',
          'Invitation has expired'
        );
      }

      // Get email and therapist info based on invitation type
      const patientEmail = invitationType === 'patient'
        ? invitation.patientEmail
        : invitation.targetEmail;

      const therapistId = invitationType === 'patient'
        ? invitation.therapistId
        : invitation.tenantId?.replace('tenant_', ''); // Extract therapist ID from tenantId

      const tenantId = invitation.tenantId;

      // Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email: patientEmail,
        password,
        displayName,
        emailVerified: false,
      });

      const uid = userRecord.uid;

      // Create user document
      const invitedBy = invitationType === 'patient'
        ? therapistId
        : invitation.invitedBy; // Admin ID for user_invitations

      await db.collection('users').doc(uid).set({
        uid,
        email: patientEmail,
        displayName,
        role: 'PATIENT',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        invitedBy,
        isDeleted: false,
      });

      // Create patient document
      await db.collection('patients').doc(uid).set({
        dateOfBirth: null, // Will be updated in profile
        phone: null,
        emergencyContact: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create therapist-patient relationship
      const relationshipId = `${therapistId}_${uid}`;
      await db.collection('therapist_patients').doc(relationshipId).set({
        therapistId,
        patientId: uid,
        tenantId,
        status: 'ACTIVE',
        relationshipStart: admin.firestore.FieldValue.serverTimestamp(),
        createdViaInvitation: token,
        auditLog: [{
          timestamp: now, // Cannot use serverTimestamp() inside arrays
          action: 'CREATE',
          userId: therapistId,
        }],
      });

      // Set custom claims
      await admin.auth().setCustomUserClaims(uid, {
        role: 'PATIENT',
        therapistIds: [therapistId],
      });

      // Mark invitation as used
      await invitationDoc.ref.update({
        status: 'USED',
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
        patientId: uid,
      });

      // Audit log
      await db.collection('audit_logs').doc(tenantId).collection('logs').add({
        action: 'CREATE_PATIENT_VIA_INVITATION',
        performedBy: therapistId,
        patientId: uid,
        invitationToken: token,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        patientId: uid,
        message: 'Patient account created successfully',
      };
    } catch (error: any) {
      console.error('Error creating patient from invitation:', error);

      if (error.code === 'auth/email-already-exists') {
        throw new functions.https.HttpsError(
          'already-exists',
          'A user with this email already exists'
        );
      }

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);
