import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface CreateTherapistRequest {
  email: string;
  password: string;
  displayName: string;
  cedula: string;              // Professional license (encrypted client-side)
  specialization: string[];
  licenseNumber?: string;
}

export const createTherapistUser = functions.https.onCall(
  async (data: CreateTherapistRequest, context) => {
    // CRITICAL: Admin-only
    if (!context.auth || context.auth.token.role !== 'ADMIN') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can create therapist accounts'
      );
    }

    const { email, password, displayName, cedula, specialization, licenseNumber } = data;

    // Validation
    if (!email || !password || !displayName || !cedula) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: email, password, displayName, cedula'
      );
    }

    if (password.length < 8) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Password must be at least 8 characters'
      );
    }

    if (!specialization || specialization.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'At least one specialization is required'
      );
    }

    try {
      const db = admin.firestore();

      // Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: false, // Therapist must verify email
      });

      const uid = userRecord.uid;
      const tenantId = `tenant_${uid}`;

      // Create user document
      await db.collection('users').doc(uid).set({
        uid,
        email,
        displayName,
        role: 'THERAPIST',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: context.auth.uid, // Admin who created
        isDeleted: false,
      });

      // Create therapist document
      await db.collection('therapists').doc(uid).set({
        cedula, // Already encrypted client-side
        specialization,
        licenseNumber: licenseNumber || '',
        tenantId,
        isVerified: true, // Admin-created = pre-verified
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        verifiedBy: context.auth.uid,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Set custom claims
      await admin.auth().setCustomUserClaims(uid, {
        role: 'THERAPIST',
        tenantId,
        isVerified: true,
      });

      // Audit log
      await db.collection('audit_logs').doc('admin').collection('logs').add({
        action: 'CREATE_THERAPIST',
        performedBy: context.auth.uid,
        performedByEmail: context.auth.token.email,
        targetUserId: uid,
        targetEmail: email,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        therapistId: uid,
        email,
        message: 'Therapist account created successfully',
      };
    } catch (error: any) {
      console.error('Error creating therapist:', error);

      // Handle specific errors
      if (error.code === 'auth/email-already-exists') {
        throw new functions.https.HttpsError(
          'already-exists',
          'A user with this email already exists'
        );
      }

      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);
