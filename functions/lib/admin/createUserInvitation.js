"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserInvitation = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const uuid_1 = require("uuid");
exports.createUserInvitation = functions.https.onCall(async (data, context) => {
    // CRITICAL: Admin-only
    if (!context.auth || context.auth.token.role !== 'ADMIN') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can create user invitations');
    }
    const { role, targetEmail, targetName, tenantId, therapistData } = data;
    // Validation
    if (!role || !targetEmail) {
        throw new functions.https.HttpsError('invalid-argument', 'Role and email are required');
    }
    if (role !== 'THERAPIST' && role !== 'PATIENT') {
        throw new functions.https.HttpsError('invalid-argument', 'Role must be THERAPIST or PATIENT');
    }
    if (!targetEmail.includes('@')) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid email is required');
    }
    // For PATIENT invitations, tenantId is required
    if (role === 'PATIENT' && !tenantId) {
        throw new functions.https.HttpsError('invalid-argument', 'Therapist assignment (tenantId) is required for patient invitations');
    }
    try {
        const db = admin.firestore();
        const adminId = context.auth.uid;
        // Check if user already exists with this email
        try {
            await admin.auth().getUserByEmail(targetEmail);
            throw new functions.https.HttpsError('already-exists', 'A user with this email already exists');
        }
        catch (err) {
            if (err.code !== 'auth/user-not-found') {
                throw err; // Re-throw if it's not "user not found"
            }
            // Continue if user not found (expected)
        }
        // Get admin info
        const adminDoc = await db.collection('users').doc(adminId).get();
        const adminData = adminDoc.data();
        // Generate unique token
        const token = (0, uuid_1.v4)();
        // Create invitation document
        const invitationData = {
            token,
            role,
            invitedBy: adminId,
            invitedByEmail: context.auth.token.email || '',
            invitedByName: (adminData === null || adminData === void 0 ? void 0 : adminData.displayName) || 'Admin',
            targetEmail,
            targetName: targetName || null,
            status: 'PENDING',
            expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
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
    }
    catch (error) {
        console.error('Error creating user invitation:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});
//# sourceMappingURL=createUserInvitation.js.map