# Admin Setup Scripts

This directory contains utility scripts for setting up and managing the MindCare platform.

## Create Admin User

### Prerequisites

1. **Download Service Account Key**:
   - Go to [Firebase Console](https://console.firebase.google.com/project/mindcare-platform-saas/settings/serviceaccounts/adminsdk)
   - Click "Generate new private key"
   - Save the JSON file as `serviceAccountKey.json` in the project root
   - **IMPORTANT**: Add `serviceAccountKey.json` to `.gitignore` (already done)

2. **Firebase Auth Must Be Enabled**:
   - Visit: https://console.firebase.google.com/project/mindcare-platform-saas/authentication
   - Enable Email/Password authentication

### Usage

```bash
node scripts/createAdmin.js <email> <password> <displayName>
```

### Example

```bash
node scripts/createAdmin.js admin@mindcare.com SecureAdmin123 "Super Admin"
```

### What This Script Does

1. ✅ Creates a new Firebase Auth user
2. ✅ Sets email as verified
3. ✅ Creates user document in Firestore with `role: "ADMIN"`
4. ✅ Sets custom claims: `{ role: "ADMIN", isVerified: true }`
5. ✅ If user exists, upgrades them to admin role

### After Running

You can sign in with the admin credentials at:
- **Development**: http://localhost:5175/login
- **Production**: https://mindcare-platform-saas.web.app/login

### Security Notes

- ⚠️ **Never commit `serviceAccountKey.json`** - It has full admin access
- ⚠️ Use a strong password for admin accounts
- ⚠️ Change default admin password after first login
- ⚠️ Limit who has access to create admin users

### Troubleshooting

**Error: "auth/email-already-exists"**
- The script will automatically upgrade the existing user to admin

**Error: "Cannot find module '../serviceAccountKey.json'"**
- Download the service account key from Firebase Console
- Place it in the project root directory

**Error: "PERMISSION_DENIED"**
- Ensure Firestore rules are deployed: `firebase deploy --only firestore:rules`

---

## System Test Templates

### Overview

System test templates are standardized psychological assessments that:
- Are available to **all therapists** in the platform
- Can be **copied and customized** by individual therapists
- Have `tenantId: null` and `isSystemTemplate: true`
- Are created by admins through the admin dashboard or these seed scripts

### Files

**`testDefinitionsData.json`** - JSON file containing all system test template definitions.

**Current Tests:**
- ✅ **BDI-II** - Beck Depression Inventory (21 questions) - Category: Depresión
- ✅ **GAD-7** - Generalized Anxiety Disorder Scale (7 questions) - Category: Ansiedad
- ✅ **PHQ-9** - Patient Health Questionnaire (9 questions) - Category: Depresión
- ✅ **EVA** - Visual Analog Scale for Emotional Distress (1 question) - Category: General

### Seed System Templates

**Usage:**
```bash
node scripts/seedTestDefinitions.js
```

**What it does:**
- Reads test definitions from `testDefinitionsData.json`
- Creates system templates in Firestore with `isSystemTemplate: true` and `tenantId: null`
- Skips tests that already exist
- Adds timestamps and metadata

### Migrate Existing Tests

**Usage:**
```bash
node scripts/migrateExistingTests.js
```

**What it does:**
- Updates existing test documents with new schema fields
- Sets `tenantId: null`, `isSystemTemplate: true`, and adds `category`
- Skips already-migrated tests

### Adding New Test Templates

1. **Add the test to `testDefinitionsData.json`:**
   ```json
   {
     "id": "new-test-id",
     "title": "Test Name",
     "description": "What this measures",
     "instructions": "Patient instructions",
     "category": "Depression|Anxiety|Stress|General",
     "questions": [...]
   }
   ```

2. **Run the seed script:**
   ```bash
   node scripts/seedTestDefinitions.js
   ```

3. **Verify:**
   - Go to Firebase Console > Firestore > `test_definitions`
   - Check the new test has correct fields
   - Test in the app: Therapist Dashboard > Tests > "Plantillas del Sistema"

### Question Types

- **MULTIPLE_CHOICE**: Options with values (e.g., 0-3 scoring)
- **SCALE**: Numeric scale (e.g., 0-10) with min/max labels
- **TEXT**: Free text response
- **YES_NO**: Boolean response

### Categories

- **Depresión** - Depression assessments
- **Ansiedad** - Anxiety assessments
- **Estrés** - Stress assessments
- **General** - Multi-purpose tools

### Data Corrections Made

Language fixes:
- ❌ "hopeless" → ✅ "desesperanzado" (BDI-II)
- ❌ Encoding issue "筛查" → ✅ "detección" (GAD-7, PHQ-9)
- ❌ "quiet" → ✅ "quieto" (GAD-7)
- ❌ "avalúa" → ✅ "evalúa" (EVA)
