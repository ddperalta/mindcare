/**
 * Script to inspect and fix custom claims for a user
 * Run with: node scripts/checkClaims.js <uid>
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
  console.error('Usage: node scripts/checkClaims.js <uid>');
  process.exit(1);
}

const user = await admin.auth().getUser(uid);
console.log('User:', user.email, '(' + user.uid + ')');
console.log('Custom Claims:', JSON.stringify(user.customClaims, null, 2));
process.exit(0);
