import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface TransferRequest {
  patientId: string;
  oldTherapistId: string;
  newTherapistId: string;
}

export const transferPatient = functions.https.onCall(
  async (data: TransferRequest, context) => {
    // Verify caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    const { patientId, oldTherapistId, newTherapistId } = data;

    if (!patientId || !oldTherapistId || !newTherapistId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: patientId, oldTherapistId, newTherapistId'
      );
    }

    // Verify caller is the old therapist
    const callerRole = context.auth.token.role;
    if (callerRole !== 'THERAPIST' && callerRole !== 'ADMIN') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only therapists or admins can transfer patients'
      );
    }

    if (callerRole === 'THERAPIST' && context.auth.uid !== oldTherapistId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You can only transfer your own patients'
      );
    }

    try {
      // Update patient's custom claims: remove old therapistId, add new one
      const patientUser = await admin.auth().getUser(patientId);
      const currentClaims = patientUser.customClaims || {};
      const therapistIds: string[] = currentClaims.therapistIds || [];

      const updatedTherapistIds = therapistIds
        .filter((id: string) => id !== oldTherapistId)
        .concat(newTherapistId);

      await admin.auth().setCustomUserClaims(patientId, {
        ...currentClaims,
        therapistIds: updatedTherapistIds,
      });

      // Create audit log entry
      const db = admin.firestore();
      await db.collection('audit_logs').doc('system').collection('logs').add({
        action: 'PATIENT_TRANSFER',
        patientId,
        oldTherapistId,
        newTherapistId,
        performedBy: context.auth.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        message: 'Patient transferred successfully',
      };
    } catch (error: any) {
      console.error('Error transferring patient:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Error transferring patient: ' + error.message
      );
    }
  }
);
