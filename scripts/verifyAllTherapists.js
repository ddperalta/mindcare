/**
 * Script to verify ALL therapists by setting isVerified=true in custom claims + Firestore
 * Run with: node scripts/verifyAllTherapists.js
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

const db = admin.firestore();

// Find all therapist users
const usersSnapshot = await db.collection('users').where('role', '==', 'THERAPIST').get();

if (usersSnapshot.empty) {
  console.log('No therapists found.');
  process.exit(0);
}

console.log(`Found ${usersSnapshot.size} therapist(s). Verifying...\n`);

for (const userDoc of usersSnapshot.docs) {
  const uid = userDoc.id;
  const data = userDoc.data();

  try {
    const authUser = await admin.auth().getUser(uid);
    const currentClaims = authUser.customClaims || {};

    if (currentClaims.isVerified === true) {
      console.log(`⏭️  ${data.email} — already verified`);
      continue;
    }

    await admin.auth().setCustomUserClaims(uid, {
      ...currentClaims,
      isVerified: true,
    });

    await db.collection('therapists').doc(uid).update({ isVerified: true });

    console.log(`✅ ${data.email} — verified`);
  } catch (err) {
    console.error(`❌ ${data.email} (${uid}) — ${err.message}`);
  }
}

console.log('\nDone. Therapists need to sign out and back in for claims to take effect.');
process.exit(0);
