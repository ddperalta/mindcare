import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

interface CreateUserInvitationRequest {
  role: 'THERAPIST' | 'PATIENT';
  targetEmail: string;
  targetName?: string;
  tenantId?: string;              // Required if role is PATIENT
  therapistData?: {               // Optional for THERAPIST
    cedula?: string;
    specialization?: string[];
    licenseNumber?: string;
  };
}

export const createUserInvitation = functions.https.onCall(
  async (data: CreateUserInvitationRequest, context) => {
    // CRITICAL: Admin-only
    if (!context.auth || context.auth.token.role !== 'ADMIN') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can create user invitations'
      );
    }

    const { role, targetEmail, targetName, tenantId, therapistData } = data;

    // Validation
    if (!role || !targetEmail) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Role and email are required'
      );
    }

    if (role !== 'THERAPIST' && role !== 'PATIENT') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Role must be THERAPIST or PATIENT'
      );
    }

    if (!targetEmail.includes('@')) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Valid email is required'
      );
    }

    // For PATIENT invitations, tenantId is required
    if (role === 'PATIENT' && !tenantId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Therapist assignment (tenantId) is required for patient invitations'
      );
    }

    try {
      const db = admin.firestore();
      const adminId = context.auth.uid;

      // Check if user already exists with this email
      try {
        await admin.auth().getUserByEmail(targetEmail);
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

      // Get admin info
      const adminDoc = await db.collection('users').doc(adminId).get();
      const adminData = adminDoc.data();

      // Generate unique token
      const token = uuidv4();

      // Create invitation document
      const invitationData: any = {
        token,
        role,
        invitedBy: adminId,
        invitedByEmail: context.auth.token.email || '',
        invitedByName: adminData?.displayName || 'Admin',
        targetEmail,
        targetName: targetName || null,
        status: 'PENDING',
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        ),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Add role-specific data
      if (role === 'PATIENT' && tenantId) {
        invitationData.tenantId = tenantId;
      }

      if (role === 'THERAPIST' && therapistData) {
        invitationData.therapistData = therapistData;
      }

      await db.collection('user_invitations').doc(token).set(invitationData);

      // Construct invitation URL based on environment
      // In production, use Firebase Hosting URL
      // In development, use localhost
      const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
      const isDevelopment = !projectId || projectId.includes('demo-') || process.env.FUNCTIONS_EMULATOR === 'true';

      const baseUrl = isDevelopment
        ? 'http://localhost:5175'
        : `https://${projectId}.web.app`;

      const invitationUrl = `${baseUrl}/register?invite=${token}`;

      // Audit log
      await db.collection('audit_logs').doc('admin').collection('logs').add({
        action: 'CREATE_USER_INVITATION',
        performedBy: adminId,
        targetRole: role,
        targetEmail,
        invitationToken: token,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        token,
        invitationUrl,
        expiresIn: '7 days',
        role,
      };
    } catch (error: any) {
      console.error('Error creating user invitation:', error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);
