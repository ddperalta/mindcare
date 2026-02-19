import { Timestamp } from 'firebase/firestore';
import type { AuditEntry } from './user.types';

export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type PaymentStatus = 'PENDING' | 'PROOF_UPLOADED' | 'CONFIRMED';

export interface BankInfo {
  bankName: string;
  clabe: string;
  accountHolder: string;
}

export interface Appointment {
  id: string;
  therapistId: string;
  patientId: string;
  tenantId: string;
  scheduledStart: Timestamp;
  scheduledEnd: Timestamp;
  status: AppointmentStatus;
  notes?: string;              // Encrypted
  location?: string;
  isVirtual?: boolean;
  meetingLink?: string;
  sessionPrice?: number;
  bankInfo?: BankInfo;
  paymentStatus?: PaymentStatus;
  paymentProofUrl?: string;
  isDeleted: boolean;
  deletedAt?: Timestamp;
  auditLog: AuditEntry[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AppointmentFormData {
  patientId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  notes?: string;
  location?: string;
  isVirtual?: boolean;
  meetingLink?: string;
  sessionPrice?: number;
  bankInfo?: BankInfo;
}
