import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'mindcare-platform-saas'
});

const SYSTEM_USER_ID = 'SYSTEM';

// Load test definitions from JSON file
const testDefinitionsData = JSON.parse(
  readFileSync(join(__dirname, 'testDefinitionsData.json'), 'utf8')
);

// Transform data to include system template fields
const testDefinitions = testDefinitionsData.map(test => ({
  ...test,
  createdBy: SYSTEM_USER_ID,
  tenantId: null,              // System templates have null tenantId
  isSystemTemplate: true,      // Mark as system template
  isActive: true
}));

const seedTestDefinitions = async () => {
  const db = admin.firestore();
  let seeded = 0;
  let skipped = 0;

  console.log('\n🌱 Starting to seed test definitions...\n');

  for (const test of testDefinitions) {
    try {
      const existingDoc = await db.collection('test_definitions').doc(test.id).get();

      if (existingDoc.exists) {
        console.log(`⏭️  Skipping "${test.title}" - already exists`);
        skipped++;
        continue;
      }

      const docData = {
        ...test,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('test_definitions').doc(test.id).set(docData);
      console.log(`✅ Seeded: ${test.title}`);
      console.log(`   📂 Category: ${test.category}`);
      console.log(`   📝 Questions: ${test.questions.length}`);
      console.log(`   🔷 System Template: ${test.isSystemTemplate}`);
      console.log('');
      seeded++;
    } catch (error) {
      console.error(`❌ Error seeding "${test.title}":`, error.message);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 Seed Summary:`);
  console.log(`${'='.repeat(50)}`);
  console.log(`   ✅ Successfully seeded: ${seeded}`);
  console.log(`   ⏭️  Skipped (already exist): ${skipped}`);
  console.log(`   📝 Total in data file: ${testDefinitions.length}`);
  console.log(`${'='.repeat(50)}\n`);

  if (seeded > 0) {
    console.log('🎉 System templates are now available for all therapists to copy!\n');
  }

  process.exit(0);
};

seedTestDefinitions().catch(error => {
  console.error('❌ Fatal error during seeding:', error);
  process.exit(1);
});
