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
exports.createPatientInvitation = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const uuid_1 = require("uuid");
exports.createPatientInvitation = functions.https.onCall(async (data, context) => {
    // CRITICAL: Verified therapist-only
    if (!context.auth ||
        context.auth.token.role !== 'THERAPIST' ||
        !context.auth.token.isVerified) {
        throw new functions.https.HttpsError('permission-denied', 'Only verified therapists can create patient invitations');
    }
    const { patientEmail, patientName } = data;
    // Validation
    if (!patientEmail || !patientEmail.includes('@')) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid email is required');
    }
    try {
        const db = admin.firestore();
        const therapistId = context.auth.uid;
        const tenantId = context.auth.token.tenantId;
        // Check if patient already exists with this email
        try {
            await admin.auth().getUserByEmail(patientEmail);
            throw new functions.https.HttpsError('already-exists', 'A user with this email already exists');
        }
        catch (err) {
            if (err.code !== 'auth/user-not-found') {
                throw err; // Re-throw if it's not "user not found"
            }
            // Continue if user not found (expected)
        }
        // Get therapist info
        const therapistDoc = await db.collection('users').doc(therapistId).get();
        const therapistData = therapistDoc.data();
        // Generate unique token
        const token = (0, uuid_1.v4)();
        // Create invitation document
        await db.collection('patient_invitations').doc(token).set({
            token,
            therapistId,
            therapistEmail: context.auth.token.email || '',
            therapistName: (therapistData === null || therapistData === void 0 ? void 0 : therapistData.displayName) || 'Unknown',
            patientEmail,
            patientName: patientName || null,
            tenantId,
            status: 'PENDING',
            expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
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
    }
    catch (error) {
        console.error('Error creating invitation:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});
//# sourceMappingURL=createPatientInvitation.js.map