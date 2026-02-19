/**
 * Script to create an admin user with proper custom claims
 * Run with: node scripts/createAdmin.js <email> <password> <displayName>
 *
 * Example: node scripts/createAdmin.js admin@mindcare.com SecurePass123 "Admin User"
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load service account key
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../serviceAccountKey.json'), 'utf8')
);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'mindcare-platform-saas'
});

const createAdminUser = async (email, password, displayName) => {
  try {
    console.log('🔧 Creating admin user...');

    // Create the user
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName,
      emailVerified: true, // Auto-verify admin email
    });

    console.log('✅ User created successfully:', userRecord.uid);

    // Create user document in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      displayName: displayName,
      role: 'ADMIN',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isDeleted: false
    });

    console.log('✅ User document created in Firestore');

    // Set custom claims for admin role
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'ADMIN',
      isVerified: true
    });

    console.log('✅ Custom claims set successfully');
    console.log('\n📋 Admin User Details:');
    console.log('   Email:', email);
    console.log('   UID:', userRecord.uid);
    console.log('   Role: ADMIN');
    console.log('\n✨ Admin user is ready to use!');
    console.log('   You can now sign in at: http://localhost:5175/login\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);

    if (error.code === 'auth/email-already-exists') {
      console.log('\n💡 User already exists. Setting admin claims instead...');

      try {
        const existingUser = await admin.auth().getUserByEmail(email);

        await admin.auth().setCustomUserClaims(existingUser.uid, {
          role: 'ADMIN',
          isVerified: true
        });

        await admin.firestore().collection('users').doc(existingUser.uid).set({
          uid: existingUser.uid,
          email: email,
          displayName: displayName,
          role: 'ADMIN',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          isDeleted: false
        }, { merge: true });

        console.log('✅ Existing user upgraded to ADMIN');
        console.log('   UID:', existingUser.uid);
        console.log('   You can now sign in at: http://localhost:5175/login\n');

        process.exit(0);
      } catch (upgradeError) {
        console.error('❌ Error upgrading existing user:', upgradeError.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
};

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('Usage: node scripts/createAdmin.js <email> <password> <displayName>');
  console.log('Example: node scripts/createAdmin.js admin@mindcare.com SecurePass123 "Admin User"');
  process.exit(1);
}

const [email, password, displayName] = args;

// Validate email
if (!email.includes('@')) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

// Validate password
if (password.length < 6) {
  console.error('❌ Password must be at least 6 characters');
  process.exit(1);
}

createAdminUser(email, password, displayName);
