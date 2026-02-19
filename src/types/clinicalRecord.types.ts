import { Timestamp } from 'firebase/firestore';
import type { AuditEntry } from './user.types';

export type SessionNoteType = 'SOAP' | 'DAP' | 'PROGRESS' | 'INTAKE' | 'DISCHARGE';

export interface SessionNoteVisibility {
  therapistOnly: boolean;
  sharedWith: string[];        // Therapist IDs
  patientCanView: boolean;
}

export interface SessionNote {
  id: string;
  therapistId: string;
  patientId: string;
  tenantId: string;
  type: SessionNoteType;
  content: string;             // Encrypted
  visibility: SessionNoteVisibility;
  sessionDate: Timestamp;
  linkedAppointmentId?: string;
  tags?: string[];
  isDeleted: boolean;
  deletedAt?: Timestamp;
  auditLog: AuditEntry[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface DAPNote {
  data: string;
  assessment: string;
  plan: string;
}

export type FeedbackType = 'APPOINTMENT' | 'TEST' | 'GOAL' | 'GENERAL';

export interface Feedback {
  id: string;
  fromUserId: string;
  toUserId: string;
  tenantId: string;
  linkedTo?: {
    type: FeedbackType;
    id: string;
  };
  content: string;
  rating?: number;             // 1-5
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  isPrivate: boolean;
  createdAt: Timestamp;
}

export type TimelineItemType = 'APPOINTMENT' | 'SESSION_NOTE' | 'TEST_APPLICATION' | 'FEEDBACK' | 'GOAL';

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  date: Timestamp;
  title: string;
  description?: string;
  data: any;                   // Original document data
}

export interface PatientTimeline {
  patientId: string;
  items: TimelineItem[];
  startDate?: Timestamp;
  endDate?: Timestamp;
}
