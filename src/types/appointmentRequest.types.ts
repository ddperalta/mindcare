import { Timestamp } from 'firebase/firestore';

export type AppointmentRequestType = 'MODIFICATION' | 'CANCELLATION';
export type AppointmentRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AppointmentRequest {
  id: string;
  appointmentId: string;
  patientId: string;
  therapistId: string;
  tenantId: string;
  type: AppointmentRequestType;
  status: AppointmentRequestStatus;
  proposedStart?: Timestamp;
  proposedEnd?: Timestamp;
  reason: string;
  responseNote?: string;
  respondedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
