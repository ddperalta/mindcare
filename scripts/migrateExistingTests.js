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

// Load test definitions from JSON file to get categories
const testDefinitionsData = JSON.parse(
  readFileSync(join(__dirname, 'testDefinitionsData.json'), 'utf8')
);

// Create a map of test IDs to categories
const testCategoryMap = testDefinitionsData.reduce((acc, test) => {
  acc[test.id] = test.category;
  return acc;
}, {});

const migrateExistingTests = async () => {
  const db = admin.firestore();
  let migrated = 0;
  let skipped = 0;

  console.log('\n🔄 Starting migration of existing test definitions...\n');

  for (const test of testDefinitionsData) {
    try {
      const docRef = db.collection('test_definitions').doc(test.id);
      const existingDoc = await docRef.get();

      if (!existingDoc.exists) {
        console.log(`⏭️  Skipping "${test.title}" - doesn't exist yet`);
        skipped++;
        continue;
      }

      const currentData = existingDoc.data();

      // Check if already migrated
      if (currentData.isSystemTemplate === true && currentData.tenantId === null) {
        console.log(`✓ "${test.title}" - already migrated`);
        skipped++;
        continue;
      }

      // Update with new schema
      const updateData = {
        tenantId: null,
        isSystemTemplate: true,
        category: testCategoryMap[test.id] || 'General',
        createdBy: SYSTEM_USER_ID,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await docRef.update(updateData);
      console.log(`✅ Migrated: ${test.title}`);
      console.log(`   📂 Category: ${updateData.category}`);
      console.log(`   🔷 tenantId: null (system template)`);
      console.log(`   🔷 isSystemTemplate: true`);
      console.log('');
      migrated++;
    } catch (error) {
      console.error(`❌ Error migrating "${test.title}":`, error.message);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 Migration Summary:`);
  console.log(`${'='.repeat(50)}`);
  console.log(`   ✅ Successfully migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped (already migrated or doesn't exist): ${skipped}`);
  console.log(`   📝 Total checked: ${testDefinitionsData.length}`);
  console.log(`${'='.repeat(50)}\n`);

  if (migrated > 0) {
    console.log('🎉 Existing tests have been migrated to system templates!\n');
  }

  process.exit(0);
};

migrateExistingTests().catch(error => {
  console.error('❌ Fatal error during migration:', error);
  process.exit(1);
});
