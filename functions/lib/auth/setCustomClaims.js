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
exports.addPatientRelationship = exports.setCustomClaims = exports.onUserCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Trigger when a new user is created
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
    try {
        const db = admin.firestore();
        // Get user document to determine role
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            console.log('User document not found for:', user.uid);
            return;
        }
        const userData = userDoc.data();
        const role = (userData === null || userData === void 0 ? void 0 : userData.role) || 'PATIENT';
        // Set default custom claims
        const customClaims = {
            role: role,
        };
        // If patient, initialize empty therapistIds array
        if (role === 'PATIENT') {
            customClaims.therapistIds = [];
        }
        // If therapist, set as unverified
        if (role === 'THERAPIST') {
            customClaims.isVerified = false;
            customClaims.tenantId = `tenant_${user.uid}`;
        }
        await admin.auth().setCustomUserClaims(user.uid, customClaims);
        console.log('Custom claims set for user:', user.uid, customClaims);
    }
    catch (error) {
        console.error('Error setting custom claims:', error);
    }
});
// Callable function to set custom claims (Admin only)
exports.setCustomClaims = functions.https.onCall(async (data, context) => {
    // Check if caller is admin
    if (!context.auth || context.auth.token.role !== 'ADMIN') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can set custom claims');
    }
    const { uid, claims } = data;
    if (!uid || !claims) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing uid or claims');
    }
    try {
        await admin.auth().setCustomUserClaims(uid, claims);
        // If verifying a therapist, update the therapist document
        if (claims.role === 'THERAPIST' && claims.isVerified) {
            await admin.firestore().collection('therapists').doc(uid).update({
                isVerified: true,
                verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        return { success: true, message: 'Custom claims updated successfully' };
    }
    catch (error) {
        console.error('Error setting custom claims:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// Callable function for therapist to add patient relationship
exports.addPatientRelationship = functions.https.onCall(async (data, context) => {
    // Check if caller is verified therapist
    if (!context.auth || context.auth.token.role !== 'THERAPIST' || !context.auth.token.isVerified) {
        throw new functions.https.HttpsError('permission-denied', 'Only verified therapists can add patient relationships');
    }
    const { patientId } = data;
    const therapistId = context.auth.uid;
    const tenantId = context.auth.token.tenantId;
    if (!patientId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing patientId');
    }
    try {
        const db = admin.firestore();
        // Create relationship document
        const relationshipId = `${therapistId}_${patientId}`;
        await db.collection('therapist_patients').doc(relationshipId).set({
            therapistId,
            patientId,
            tenantId,
            status: 'ACTIVE',
            relationshipStart: admin.firestore.FieldValue.serverTimestamp(),
            auditLog: [{
                    timestamp: admin.firestore.Timestamp.now(),
                    userId: therapistId,
                    action: 'CREATE',
                }]
        });
        // Update patient's custom claims to include this therapist
        const patient = await admin.auth().getUser(patientId);
        const existingClaims = patient.customClaims || {};
        const therapistIds = existingClaims.therapistIds || [];
        if (!therapistIds.includes(therapistId)) {
            therapistIds.push(therapistId);
            await admin.auth().setCustomUserClaims(patientId, Object.assign(Object.assign({}, existingClaims), { therapistIds }));
        }
        return { success: true, message: 'Patient relationship created successfully' };
    }
    catch (error) {
        console.error('Error adding patient relationship:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
//# sourceMappingURL=setCustomClaims.js.map