# MindCare - Mental Health SaaS Platform

A professional platform for psychologists and therapists to manage clinical practice, including patient management, appointment scheduling, psychological testing, and clinical records.

## Features

- Multi-tenant architecture for therapist practices
- Patient management with clinical profiles
- Appointment scheduling with calendar views
- Psychological test assignments and versioning
- Session notes with longitudinal clinical records
- Role-based access control (Patient/Therapist/Admin)
- Multi-language support (Spanish, English)

## Requirements

- Node.js 20+
- Firebase account
- Firebase CLI (`npm install -g firebase-tools`)
- Environment variables (see `.env.example`):

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

## Instructions

### Installation

```bash
npm install
cd functions && npm install && cd ..
```

### Development

```bash
npm run dev
```

### Build & Deploy

```bash
npm run deploy           # Deploy everything
npm run deploy:hosting   # Frontend only
npm run deploy:functions # Cloud Functions only
npm run deploy:firestore # Firestore rules & indexes
npm run deploy:all       # Build & deploy everything
```

### Firebase Emulators

```bash
npm run firebase:emulators
```

## User Roles

- **Patient**: View appointments, take tests, see shared records
- **Therapist**: Manage patients, create appointments, assign tests, write clinical notes
- **Admin**: Verify therapists, manage users

## License

MIT License
