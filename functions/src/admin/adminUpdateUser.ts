import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface UpdateUserRequest {
  uid: string;
  displayName: string;
  email: string;
  specialization?: string[]; // therapists only
}

export const adminUpdateUser = functions.https.onCall(
  async (data: UpdateUserRequest, context) => {
    if (!context.auth || context.auth.token.role !== 'ADMIN') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can update user details'
      );
    }

    const { uid, displayName, email, specialization } = data;

    if (!uid || !displayName || !email) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: uid, displayName, email'
      );
    }

    try {
      const db = admin.firestore();

      // Update Firebase Auth
      await admin.auth().updateUser(uid, { displayName, email });

      // Update Firestore users doc
      await db.collection('users').doc(uid).update({ displayName, email });

      // Update therapist specialization if provided
      if (specialization !== undefined) {
        await db.collection('therapists').doc(uid).update({ specialization });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating user:', error);
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
