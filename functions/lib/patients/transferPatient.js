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
exports.transferPatient = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
exports.transferPatient = functions.https.onCall(async (data, context) => {
    // Verify caller is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { patientId, oldTherapistId, newTherapistId } = data;
    if (!patientId || !oldTherapistId || !newTherapistId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: patientId, oldTherapistId, newTherapistId');
    }
    // Verify caller is the old therapist
    const callerRole = context.auth.token.role;
    if (callerRole !== 'THERAPIST' && callerRole !== 'ADMIN') {
        throw new functions.https.HttpsError('permission-denied', 'Only therapists or admins can transfer patients');
    }
    if (callerRole === 'THERAPIST' && context.auth.uid !== oldTherapistId) {
        throw new functions.https.HttpsError('permission-denied', 'You can only transfer your own patients');
    }
    try {
        // Update patient's custom claims: remove old therapistId, add new one
        const patientUser = await admin.auth().getUser(patientId);
        const currentClaims = patientUser.customClaims || {};
        const therapistIds = currentClaims.therapistIds || [];
        const updatedTherapistIds = therapistIds
            .filter((id) => id !== oldTherapistId)
            .concat(newTherapistId);
        await admin.auth().setCustomUserClaims(patientId, Object.assign(Object.assign({}, currentClaims), { therapistIds: updatedTherapistIds }));
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
    }
    catch (error) {
        console.error('Error transferring patient:', error);
        throw new functions.https.HttpsError('internal', 'Error transferring patient: ' + error.message);
    }
});
//# sourceMappingURL=transferPatient.js.map