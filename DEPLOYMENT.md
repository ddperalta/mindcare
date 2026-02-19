# 🚀 Deployment Guide - MindCare Platform

Complete guide for deploying the MindCare mental health SaaS platform to Firebase.

---

## 📋 Prerequisites

Before deploying, ensure you have:

- [x] Firebase CLI installed (`npm install -g firebase-tools`)
- [x] Authenticated with Firebase (`firebase login`)
- [x] `.env` file configured with Firebase credentials
- [x] Firebase Auth enabled in Firebase Console
- [x] Admin user created (using `scripts/createAdmin.js`)

---

## 🎯 Deployment Commands

### **Quick Deploy (Hosting Only)**

Deploy just the frontend application:

```bash
npm run deploy:hosting
```

**What it does:**
1. Builds the React app (`tsc -b && vite build`)
2. Deploys to Firebase Hosting
3. **URL:** https://mindcare-platform-saas.web.app

**Use when:** You've only made frontend changes

---

### **Deploy Cloud Functions**

Deploy backend Cloud Functions:

```bash
npm run deploy:functions
```

**What it does:**
1. Builds TypeScript functions
2. Deploys to Firebase Cloud Functions
3. Includes: `onUserCreated`, `setCustomClaims`, `addPatientRelationship`

**Use when:** You've modified Cloud Functions

⚠️ **Note:** Requires Firebase Auth to be enabled

---

### **Deploy Firestore Rules & Indexes**

Deploy database security rules and indexes:

```bash
npm run deploy:firestore
```

**What it does:**
1. Deploys `firestore.rules` (security rules)
2. Deploys `firestore.indexes.json` (composite indexes)

**Use when:** You've modified security rules or indexes

---

### **Full Deployment (Everything)**

Deploy the entire application:

```bash
npm run deploy:all
```

**What it does:**
1. Builds React app
2. Builds Cloud Functions
3. Deploys Hosting + Functions + Firestore rules/indexes

**Use when:** First deployment or major changes across all components

---

### **Default Deployment**

```bash
npm run deploy
```

Equivalent to `deploy:all` - deploys everything.

---

## 🔧 Development Commands

### **Local Development Server**

```bash
npm run dev
```

- Starts Vite dev server at http://localhost:5173
- Hot module replacement (HMR) enabled
- Uses `.env` for Firebase config

---

### **Firebase Emulators**

Run Firebase services locally:

```bash
npm run firebase:emulators
```

**Starts:**
- Firestore Emulator (port 8080)
- Auth Emulator (port 9099)
- Functions Emulator (port 5001)
- Hosting Emulator (port 5000)

**Configure `.env`:**
```env
VITE_USE_EMULATORS=true
```

---

### **Build Locally**

Build without deploying:

```bash
npm run build
```

Output: `dist/` directory

**Preview build:**
```bash
npm run preview
```

---

## 📝 Deployment Checklist

### **First-Time Deployment**

- [ ] 1. **Enable Firebase Services**
  ```bash
  # Enable Firebase Auth
  firebase open auth

  # Enable required APIs in Google Cloud Console
  ```

- [ ] 2. **Configure Environment Variables**
  ```bash
  cp .env.example .env
  # Fill in Firebase credentials from Console
  ```

- [ ] 3. **Deploy Firestore Rules**
  ```bash
  npm run deploy:firestore
  ```

- [ ] 4. **Create Admin User**
  ```bash
  node scripts/createAdmin.js admin@mindcare.com SecurePass123 "Admin"
  ```

- [ ] 5. **Deploy Functions**
  ```bash
  npm run deploy:functions
  ```

- [ ] 6. **Deploy Hosting**
  ```bash
  npm run deploy:hosting
  ```

- [ ] 7. **Test Production**
  - Visit: https://mindcare-platform-saas.web.app
  - Sign in with admin credentials
  - Test language switching
  - Verify role-based routing

---

### **Regular Deployments**

- [ ] 1. **Pull latest changes**
  ```bash
  git pull origin main
  ```

- [ ] 2. **Install dependencies** (if package.json changed)
  ```bash
  npm install
  cd functions && npm install && cd ..
  ```

- [ ] 3. **Run linter**
  ```bash
  npm run lint
  ```

- [ ] 4. **Build locally**
  ```bash
  npm run build
  ```

- [ ] 5. **Test locally**
  ```bash
  npm run preview
  ```

- [ ] 6. **Deploy**
  ```bash
  npm run deploy:hosting  # Frontend only
  # OR
  npm run deploy:all      # Everything
  ```

---

## 🌍 Deployment Environments

### **Production**

- **Hosting:** https://mindcare-platform-saas.web.app
- **Console:** https://console.firebase.google.com/project/mindcare-platform-saas
- **Project ID:** `mindcare-platform-saas`
- **Region:** us-central1

### **Preview Channels** (Optional)

Create preview deployments:

```bash
firebase hosting:channel:deploy preview-name
```

**Use for:** Testing before production deployment

---

## 🔍 Post-Deployment Verification

### **1. Check Hosting**
```bash
curl https://mindcare-platform-saas.web.app
```

Should return the HTML content.

### **2. Check Functions**
```bash
firebase functions:log
```

View Cloud Functions logs.

### **3. Check Firestore**
Visit: https://console.firebase.google.com/project/mindcare-platform-saas/firestore

Verify rules are deployed.

### **4. Test Authentication**
1. Go to https://mindcare-platform-saas.web.app/login
2. Sign in with test credentials
3. Verify redirect to correct dashboard

### **5. Test Language Switching**
- Click 🇲🇽 / 🇺🇸 flags
- Verify UI updates
- Refresh page - language should persist

---

## 🐛 Troubleshooting

### **Build Fails**

```bash
# Clear build cache
rm -rf dist node_modules/.vite

# Reinstall dependencies
npm install

# Build again
npm run build
```

### **Functions Deploy Fails**

**Error: "Node.js 18 decommissioned"**
- ✅ Fixed: Using Node.js 20 (already configured)

**Error: "Firebase Auth not enabled"**
- Enable Auth in Console: https://console.firebase.google.com/project/mindcare-platform-saas/authentication

**Error: "Permission denied"**
- Run: `firebase login` and re-authenticate

### **Hosting Deploy Fails**

**Error: "dist directory not found"**
```bash
npm run build  # Build first
npm run deploy:hosting
```

### **Firestore Rules Deploy Fails**

**Error: "Invalid rules syntax"**
```bash
# Validate rules locally
firebase firestore:rules:validate
```

---

## 📊 Monitoring Deployments

### **View Deployment History**
```bash
firebase hosting:releases:list
```

### **Rollback Deployment**
```bash
firebase hosting:rollback
```

### **Monitor Functions**
```bash
firebase functions:log --only onUserCreated
```

### **View Analytics**
- Console: https://console.firebase.google.com/project/mindcare-platform-saas/analytics

---

## 🔐 Security Notes

### **Before Deploying**

- [ ] Never commit `.env` files
- [ ] Never commit `serviceAccountKey.json`
- [ ] Review Firestore security rules
- [ ] Test authentication flows
- [ ] Verify multi-tenant isolation

### **After Deploying**

- [ ] Test with different user roles (Admin/Therapist/Patient)
- [ ] Verify data access restrictions
- [ ] Test in incognito mode
- [ ] Check for console errors
- [ ] Monitor Cloud Functions logs for errors

---

## 📈 Performance Optimization

### **Before Deploy**

1. **Analyze Bundle Size**
   ```bash
   npm run build
   # Check dist/assets/*.js size
   ```

2. **Optimize Images**
   - Use WebP format
   - Compress images
   - Use responsive images

3. **Code Splitting**
   - Lazy load routes
   - Dynamic imports for heavy components

---

## 🎯 Deployment Best Practices

1. **Always test locally first**
   ```bash
   npm run build
   npm run preview
   ```

2. **Use preview channels for major changes**
   ```bash
   firebase hosting:channel:deploy staging
   ```

3. **Deploy in stages**
   - Deploy Firestore rules first
   - Then functions
   - Finally hosting

4. **Monitor after deployment**
   - Check error logs
   - Monitor performance
   - Verify user flows

5. **Keep dependencies updated**
   ```bash
   npm outdated
   npm update
   ```

---

## 📞 Support

**Issues?**
- Check Firebase Console logs
- Review deployment logs
- Check GitHub Issues: https://github.com/anthropics/claude-code/issues

**Need help?**
- Firebase Documentation: https://firebase.google.com/docs
- Vite Documentation: https://vitejs.dev/guide/

---

## ✅ Quick Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build React app |
| `npm run deploy` | Deploy everything |
| `npm run deploy:hosting` | Deploy frontend only |
| `npm run deploy:functions` | Deploy Cloud Functions only |
| `npm run deploy:firestore` | Deploy Firestore rules/indexes |
| `npm run preview` | Preview production build locally |
| `firebase:emulators` | Run Firebase emulators |

---

**Last Updated:** Week 1 Implementation
**Project:** MindCare Mental Health SaaS Platform
**Firebase Project ID:** mindcare-platform-saas
