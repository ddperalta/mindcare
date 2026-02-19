import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export type NotificationType = 'APPOINTMENT_UPDATED' | 'APPOINTMENT_UNCANCELLED';

export async function sendNotification(
  userId: string,
  type: NotificationType,
  appointmentId: string,
  message: string
) {
  await addDoc(collection(db, 'notifications'), {
    userId,
    type,
    appointmentId,
    message,
    isRead: false,
    createdAt: Timestamp.now(),
  });
}
