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
exports.createTherapistFromInvitation = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
exports.createTherapistFromInvitation = functions.https.onCall(async (data, context) => {
    var _a;
    const { token, displayName, password, cedula, specialization, licenseNumber } = data;
    // Validation
    if (!token || !displayName || !password || !cedula || !specialization) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }
    if (password.length < 8) {
        throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 8 characters');
    }
    try {
        const db = admin.firestore();
        // Re-validate invitation (prevent race conditions)
        const invitationDoc = await db.collection('user_invitations').doc(token).get();
        if (!invitationDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Invalid invitation token');
        }
        const invitation = invitationDoc.data();
        // Check role
        if (invitation.role !== 'THERAPIST') {
            throw new functions.https.HttpsError('invalid-argument', 'This invitation is not for a therapist account');
        }
        // Check status
        if (invitation.status !== 'PENDING') {
            throw new functions.https.HttpsError('failed-precondition', 'Invitation has already been used or cancelled');
        }
        // Check expiration
        const now = admin.firestore.Timestamp.now();
        if (invitation.expiresAt.toMillis() < now.toMillis()) {
            await invitationDoc.ref.update({ status: 'EXPIRED' });
            throw new functions.https.HttpsError('deadline-exceeded', 'Invitation has expired');
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
            licenseNumber: licenseNumber || ((_a = invitation.therapistData) === null || _a === void 0 ? void 0 : _a.licenseNumber) || '',
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
    }
    catch (error) {
        console.error('Error creating therapist from invitation:', error);
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'A user with this email already exists');
        }
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});
//# sourceMappingURL=createTherapistFromInvitation.js.map