import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  type User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User, UserRole, CustomClaims } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  customClaims: CustomClaims | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshClaims: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [customClaims, setCustomClaims] = useState<CustomClaims | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from Firestore
  const fetchUserProfile = async (user: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as User);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Fetch custom claims
  const fetchCustomClaims = async (user: FirebaseUser) => {
    try {
      let tokenResult = await user.getIdTokenResult();
      // If role is missing, the onUserCreated trigger may not have run yet — force refresh
      if (!tokenResult.claims.role) {
        tokenResult = await user.getIdTokenResult(true);
      }
      const claims = tokenResult.claims;
      if (claims.role) {
        setCustomClaims({
          role: claims.role as UserRole,
          tenantId: claims.tenantId as string | undefined,
          therapistIds: claims.therapistIds as string[] | undefined,
          isVerified: claims.isVerified as boolean | undefined,
        });
      }
    } catch (error) {
      console.error('Error fetching custom claims:', error);
    }
  };

  // Refresh claims (call after role changes)
  const refreshClaims = async () => {
    if (currentUser) {
      await currentUser.getIdToken(true); // Force refresh
      await fetchCustomClaims(currentUser);
    }
  };

  // Sign up
  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole
  ) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile
    await updateProfile(user, { displayName });

    // Create user document
    const userData: User = {
      uid: user.uid,
      email: user.email!,
      displayName,
      role,
      createdAt: Timestamp.now(),
      isDeleted: false,
    };

    await setDoc(doc(db, 'users', user.uid), userData);

    // If therapist, create therapist document (unverified)
    if (role === 'THERAPIST') {
      await setDoc(doc(db, 'therapists', user.uid), {
        cedula: '', // Will be filled in profile
        specialization: [],
        licenseNumber: '',
        tenantId: `tenant_${user.uid}`,
        isVerified: false,
        createdAt: Timestamp.now(),
      });
    }

    // If patient, create patient document
    if (role === 'PATIENT') {
      await setDoc(doc(db, 'patients', user.uid), {
        dateOfBirth: Timestamp.now(), // Will be updated in profile
        createdAt: Timestamp.now(),
      });
    }
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // Sign out
  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
    setCustomClaims(null);
  };

  // Reset password
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        await Promise.all([
          fetchUserProfile(user),
          fetchCustomClaims(user)
        ]);
      } else {
        setUserProfile(null);
        setCustomClaims(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    customClaims,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshClaims,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
