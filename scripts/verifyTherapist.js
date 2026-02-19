/**
 * Script to verify a therapist by setting isVerified=true in custom claims
 * Run with: node scripts/verifyTherapist.js <uid>
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'mindcare-platform-saas'
});

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/verifyTherapist.js <uid>');
  process.exit(1);
}

const user = await admin.auth().getUser(uid);
const currentClaims = user.customClaims || {};
console.log('Current claims:', JSON.stringify(currentClaims));

await admin.auth().setCustomUserClaims(uid, {
  ...currentClaims,
  isVerified: true,
});

console.log('✅ isVerified set to true for', user.email);

// Also update Firestore therapists document
await admin.firestore().collection('therapists').doc(uid).update({
  isVerified: true,
});
console.log('✅ Firestore therapists document updated');

process.exit(0);
