# MindCare - Mental Health SaaS Platform

A professional platform for psychologists and therapists to manage clinical practice, including patient management, appointment scheduling, psychological testing with versioning, and longitudinal clinical records.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS v4 (teal/mint/coral design system)
- **Backend**: Firebase Cloud Functions (TypeScript)
- **Database**: Cloud Firestore
- **Authentication**: Firebase Auth with custom claims (RBAC)
- **Hosting**: Firebase Hosting

## Project Structure

```
mental-health-saas/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── common/       # Button, Input, Card, Modal
│   │   ├── auth/         # ProtectedRoute
│   │   └── ...           # (appointments, patients, tests, etc.)
│   ├── pages/
│   │   ├── public/       # Login, Register
│   │   ├── therapist/    # Therapist dashboard
│   │   └── patient/      # Patient dashboard
│   ├── contexts/         # AuthContext
│   ├── config/           # Firebase config, constants, theme
│   ├── types/            # TypeScript type definitions
│   ├── routes/           # React Router configuration
│   └── services/         # API services
├── functions/            # Firebase Cloud Functions
│   └── src/
│       └── auth/         # Custom claims management
├── firestore.rules       # Firestore security rules
├── firestore.indexes.json # Firestore indexes
└── firebase.json         # Firebase configuration
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Firebase account
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

2. **Create Firebase project** (if not already created):
   ```bash
   firebase login
   firebase projects:create mental-health-saas
   ```

3. **Initialize Firebase services**:
   ```bash
   firebase use mental-health-saas
   ```

4. **Set up environment variables**:
   Copy `.env.example` to `.env` and fill in your Firebase credentials:
   ```bash
   cp .env.example .env
   ```

   Get your Firebase config from the Firebase Console (Project Settings > General > Your apps > Web app).

5. **Deploy Firestore rules and indexes**:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

6. **Deploy Cloud Functions**:
   ```bash
   firebase deploy --only functions
   ```

### Development

1. **Run the development server**:
   ```bash
   npm run dev
   ```

2. **Run Firebase emulators** (optional, for local testing):
   ```bash
   firebase emulators:start
   ```

   Add `VITE_USE_EMULATORS=true` to your `.env` file to connect to emulators.

### Build & Deploy

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy to Firebase Hosting**:
   ```bash
   firebase deploy --only hosting
   ```

3. **Deploy everything**:
   ```bash
   firebase deploy
   ```

## Features Implemented (Week 1)

### ✅ Completed

- [x] React + Vite + TypeScript project setup
- [x] TailwindCSS v4 with teal/mint/coral design system
- [x] Firebase configuration (Auth, Firestore, Functions)
- [x] Complete TypeScript type system
- [x] Authentication system with AuthContext
- [x] Login & Register pages with role selection
- [x] Protected routes with role-based access control
- [x] Therapist & Patient dashboards (basic)
- [x] Cloud Functions for custom claims management
- [x] Firestore security rules (multi-tenant isolation)
- [x] Common UI components (Button, Input, Card, Modal)
- [x] Build pipeline configured
- [x] i18n support (Spanish MX as default, English available)
- [x] Language switcher component

### 🚧 Pending

- [ ] Create Firebase project (needs project ID decision)

## User Roles

- **Patient**: Can view appointments, take tests, see shared records
- **Therapist**: Can manage patients, create appointments, assign tests, write clinical notes
- **Admin**: Can verify therapists, manage users

## Custom Claims

The platform uses Firebase custom claims for role-based access control:

```typescript
{
  role: 'THERAPIST' | 'PATIENT' | 'ADMIN',
  tenantId?: string,          // For therapists
  therapistIds?: string[],    // For patients
  isVerified?: boolean        // For therapists
}
```

## Security

- Multi-tenant isolation via `tenantId`
- Firestore security rules enforce RBAC
- Field-level encryption for sensitive data (cedula, session notes)
- Audit logging for all clinical data changes
- Soft deletes (no permanent deletion of clinical records)

## Internationalization (i18n)

The platform supports multiple languages with **Spanish (Mexico)** as the default language:

- **Default Language**: Spanish (Mexico) - `es-MX`
- **Available Languages**: English - `en`
- **Library**: react-i18next
- **Language Detection**: Browser language + localStorage persistence
- **Language Switcher**: Available on all public pages (Login, Register)

### Adding New Languages

1. Create a new translation file in `src/locales/[language-code]/translation.json`
2. Add the language to `src/config/i18n.ts`
3. Update the `LanguageSwitcher` component to include the new language

### Translation Keys

All translations are organized in namespaces:
- `app.*` - Application name and description
- `common.*` - Common UI elements (buttons, labels, etc.)
- `auth.*` - Authentication flows
- `dashboard.*` - Dashboard content
- `appointments.*`, `patients.*`, `tests.*` - Feature-specific translations

## Design System

### Colors
- **Teal (#14b8a6)**: Primary color
- **Mint (#22c55e)**: Secondary color
- **Coral (#ef4444)**: CTAs and important actions
- **Sage**: Neutral grays

### Typography
- **Sans**: Inter
- **Display**: Poppins

### Custom Classes
- `btn-primary`, `btn-secondary`, `btn-ghost`
- `card`, `card-elevated`
- `input-field`, `input-error`
- `label`, `error-text`

## Next Steps (Week 2-4)

1. Complete Firebase project creation and deployment
2. Implement user profile pages
3. Build therapist-patient relationship system
4. Create appointments CRUD with calendar view
5. Implement email notifications
6. Build landing page with two-column layout

## Scripts

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run preview                # Preview production build

# Deployment (NEW!)
npm run deploy                 # Deploy everything (hosting + functions)
npm run deploy:hosting         # Deploy frontend only
npm run deploy:functions       # Deploy Cloud Functions only
npm run deploy:firestore       # Deploy Firestore rules & indexes
npm run deploy:all             # Build & deploy everything

# Firebase Emulators
npm run firebase:emulators     # Start Firebase emulators locally

# Build Functions
npm run build:functions        # Build Cloud Functions TypeScript

# Firebase CLI
npm run firebase:login         # Login to Firebase
npm run firebase:init          # Initialize Firebase features
```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## Environment Variables

Required environment variables (`.env`):

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_ENCRYPTION_KEY=
VITE_ENV=development
```

## License

Private project - All rights reserved

## Support

For issues or questions, please contact the development team.
