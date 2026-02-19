import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface ValidateInvitationRequest {
  token: string;
}

export const validateInvitation = functions.https.onCall(
  async (data: ValidateInvitationRequest, context) => {
    const { token } = data;

    if (!token) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invitation token is required'
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

      // Check status
      if (invitation.status !== 'PENDING') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Invitation has already been ${invitation.status.toLowerCase()}`
        );
      }

      // Check expiration
      const now = admin.firestore.Timestamp.now();
      if (invitation.expiresAt.toMillis() < now.toMillis()) {
        // Mark as expired
        await invitationDoc.ref.update({ status: 'EXPIRED' });
        throw new functions.https.HttpsError(
          'deadline-exceeded',
          'Invitation has expired'
        );
      }

      // Return invitation details based on type
      if (invitationType === 'patient') {
        // Patient invitation (therapist-created)
        return {
          valid: true,
          role: 'PATIENT',
          therapistName: invitation.therapistName,
          patientEmail: invitation.patientEmail,
          patientName: invitation.patientName || '',
          expiresAt: invitation.expiresAt.toDate().toISOString(),
        };
      } else {
        // User invitation (admin-created)
        return {
          valid: true,
          role: invitation.role,
          invitedByName: invitation.invitedByName,
          targetEmail: invitation.targetEmail,
          targetName: invitation.targetName || '',
          expiresAt: invitation.expiresAt.toDate().toISOString(),
          therapistData: invitation.therapistData || null,
        };
      }
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error('Error validating invitation:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);
