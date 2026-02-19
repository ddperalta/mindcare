import { Timestamp } from 'firebase/firestore';

export type UserRole = 'THERAPIST' | 'PATIENT' | 'ADMIN';

export interface CustomClaims {
  role: UserRole;
  tenantId?: string;           // Only for therapists
  therapistIds?: string[];     // For patients - authorized therapists
  isVerified?: boolean;        // For therapists - admin approval
}

export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: Timestamp;
  isDeleted: boolean;
  deletedAt?: Timestamp;
}

export interface Therapist extends User {
  role: 'THERAPIST';
  cedula: string;              // Encrypted professional license number
  specialization: string[];
  licenseNumber: string;
  tenantId: string;
  isVerified: boolean;
  bio?: string;
  phone?: string;
  bankInfo?: {
    bankName: string;
    clabe: string;
    accountHolder: string;
  };
}

export interface Patient extends User {
  role: 'PATIENT';
  dateOfBirth: Timestamp;
  phone?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface TherapistPatientRelationship {
  id: string;                  // Format: {therapistId}_{patientId}
  therapistId: string;
  patientId: string;
  tenantId: string;
  status: 'ACTIVE' | 'INACTIVE';
  relationshipStart: Timestamp;
  relationshipEnd?: Timestamp;
  notes?: string;
  auditLog: AuditEntry[];
}

export interface AuditEntry {
  timestamp: Timestamp;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  changes?: Record<string, any>;
}
