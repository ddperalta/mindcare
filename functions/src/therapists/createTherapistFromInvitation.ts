import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface CreateTherapistFromInvitationRequest {
  token: string;
  displayName: string;
  password: string;
  cedula: string;
  specialization: string[];
  licenseNumber?: string;
}

export const createTherapistFromInvitation = functions.https.onCall(
  async (data: CreateTherapistFromInvitationRequest, context) => {
    const { token, displayName, password, cedula, specialization, licenseNumber } = data;

    // Validation
    if (!token || !displayName || !password || !cedula || !specialization) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields'
      );
    }

    if (password.length < 8) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Password must be at least 8 characters'
      );
    }

    try {
      const db = admin.firestore();

      // Re-validate invitation (prevent race conditions)
      const invitationDoc = await db.collection('user_invitations').doc(token).get();

      if (!invitationDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Invalid invitation token'
        );
      }

      const invitation = invitationDoc.data()!;

      // Check role
      if (invitation.role !== 'THERAPIST') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'This invitation is not for a therapist account'
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

      // Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email: invitation.targetEmail,
        password,
        displayName,
        emailVerified: false,
      });

      const uid = userRecord.uid;
      const tenantId = `tenant_${uid}`;

      // Create user document
      await db.collection('users').doc(uid).set({
        uid,
        email: invitation.targetEmail,
        displayName,
        role: 'THERAPIST',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        invitedBy: invitation.invitedBy,
        isDeleted: false,
      });

      // Merge invitation therapistData with form data
      const finalTherapistData = {
        cedula,
        specialization,
        licenseNumber: licenseNumber || invitation.therapistData?.licenseNumber || '',
        tenantId,
        isVerified: true, // Admin-created = pre-verified
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        verifiedBy: invitation.invitedBy,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Create therapist document
      await db.collection('therapists').doc(uid).set(finalTherapistData);

      // Set custom claims
      await admin.auth().setCustomUserClaims(uid, {
        role: 'THERAPIST',
        tenantId,
        isVerified: true,
      });

      // Mark invitation as used
      await invitationDoc.ref.update({
        status: 'USED',
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
        userId: uid,
      });

      // Audit log
      await db.collection('audit_logs').doc(tenantId).collection('logs').add({
        action: 'CREATE_THERAPIST_VIA_INVITATION',
        performedBy: invitation.invitedBy,
        therapistId: uid,
        invitationToken: token,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        therapistId: uid,
        message: 'Therapist account created successfully',
      };
    } catch (error: any) {
      console.error('Error creating therapist from invitation:', error);

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
