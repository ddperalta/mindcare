import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

interface CreateInvitationRequest {
  patientEmail: string;
  patientName?: string;
}

export const createPatientInvitation = functions.https.onCall(
  async (data: CreateInvitationRequest, context) => {
    // CRITICAL: Verified therapist-only
    if (!context.auth ||
        context.auth.token.role !== 'THERAPIST' ||
        !context.auth.token.isVerified) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only verified therapists can create patient invitations'
      );
    }

    const { patientEmail, patientName } = data;

    // Validation
    if (!patientEmail || !patientEmail.includes('@')) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Valid email is required'
      );
    }

    try {
      const db = admin.firestore();
      const therapistId = context.auth.uid;
      const tenantId = context.auth.token.tenantId;

      // Check if patient already exists with this email
      try {
        await admin.auth().getUserByEmail(patientEmail);
        throw new functions.https.HttpsError(
          'already-exists',
          'A user with this email already exists'
        );
      } catch (err: any) {
        if (err.code !== 'auth/user-not-found') {
          throw err; // Re-throw if it's not "user not found"
        }
        // Continue if user not found (expected)
      }

      // Get therapist info
      const therapistDoc = await db.collection('users').doc(therapistId).get();
      const therapistData = therapistDoc.data();

      // Generate unique token
      const token = uuidv4();

      // Create invitation document
      await db.collection('patient_invitations').doc(token).set({
        token,
        therapistId,
        therapistEmail: context.auth.token.email || '',
        therapistName: therapistData?.displayName || 'Unknown',
        patientEmail,
        patientName: patientName || null,
        tenantId,
        status: 'PENDING',
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        ),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Construct invitation URL based on environment
      // In production, use Firebase Hosting URL
      // In development, use localhost
      const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
      const isDevelopment = !projectId || projectId.includes('demo-') || process.env.FUNCTIONS_EMULATOR === 'true';

      const baseUrl = isDevelopment
        ? 'http://localhost:5175'
        : `https://${projectId}.web.app`;

      const invitationUrl = `${baseUrl}/register?invite=${token}`;

      return {
        success: true,
        token,
        invitationUrl,
        expiresIn: '7 days',
      };
    } catch (error: any) {
      console.error('Error creating invitation:', error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);
