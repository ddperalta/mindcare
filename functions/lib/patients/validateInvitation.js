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
exports.validateInvitation = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
exports.validateInvitation = functions.https.onCall(async (data, context) => {
    const { token } = data;
    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'Invitation token is required');
    }
    try {
        const db = admin.firestore();
        // Try patient_invitations first (therapist-created)
        let invitationDoc = await db.collection('patient_invitations').doc(token).get();
        let invitationType = 'patient';
        // If not found, try user_invitations (admin-created)
        if (!invitationDoc.exists) {
            invitationDoc = await db.collection('user_invitations').doc(token).get();
            invitationType = 'user';
        }
        if (!invitationDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Invalid invitation token');
        }
        const invitation = invitationDoc.data();
        // Check status
        if (invitation.status !== 'PENDING') {
            throw new functions.https.HttpsError('failed-precondition', `Invitation has already been ${invitation.status.toLowerCase()}`);
        }
        // Check expiration
        const now = admin.firestore.Timestamp.now();
        if (invitation.expiresAt.toMillis() < now.toMillis()) {
            // Mark as expired
            await invitationDoc.ref.update({ status: 'EXPIRED' });
            throw new functions.https.HttpsError('deadline-exceeded', 'Invitation has expired');
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
        }
        else {
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Error validating invitation:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
//# sourceMappingURL=validateInvitation.js.map