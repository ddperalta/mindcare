import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  onSnapshot,
  orderBy,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { AppointmentRequest } from '../types';

export function useAppointmentRequests() {
  const { currentUser, customClaims } = useAuth();
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || !customClaims) return;

    let unsubscribe: Unsubscribe | undefined;
    const col = collection(db, 'appointment_requests');
    const role = customClaims.role;

    let q;
    if (role === 'THERAPIST') {
      q = query(col, where('therapistId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
    } else if (role === 'PATIENT') {
      q = query(col, where('patientId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
    } else if (role === 'ADMIN') {
      q = query(col, orderBy('createdAt', 'desc'));
    } else {
      setLoading(false);
      return;
    }

    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppointmentRequest));
        setRequests(data);
        setPendingCount(data.filter(r => r.status === 'PENDING').length);
        setLoading(false);
      },
      (err) => {
        console.error('Request snapshot error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe?.();
    };
  }, [currentUser, customClaims]);

  const createRequest = async (
    appointmentId: string,
    type: 'MODIFICATION' | 'CANCELLATION',
    reason: string,
    proposedStart?: Date,
    proposedEnd?: Date
  ) => {
    if (!currentUser) throw new Error('Not authenticated');

    // Get appointment to find therapistId and tenantId
    const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
    if (!appointmentDoc.exists()) throw new Error('Appointment not found');
    const appointment = appointmentDoc.data();

    const requestData: any = {
      appointmentId,
      patientId: currentUser.uid,
      therapistId: appointment.therapistId,
      tenantId: appointment.tenantId,
      type,
      status: 'PENDING',
      reason,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    if (type === 'MODIFICATION' && proposedStart && proposedEnd) {
      requestData.proposedStart = Timestamp.fromDate(proposedStart);
      requestData.proposedEnd = Timestamp.fromDate(proposedEnd);
    }

    const docRef = await addDoc(collection(db, 'appointment_requests'), requestData);
    return docRef.id;
  };

  const approveRequest = async (requestId: string) => {
    if (!currentUser) throw new Error('Not authenticated');

    const requestDoc = await getDoc(doc(db, 'appointment_requests', requestId));
    if (!requestDoc.exists()) throw new Error('Request not found');
    const request = requestDoc.data() as AppointmentRequest;

    // Update request status
    await updateDoc(doc(db, 'appointment_requests', requestId), {
      status: 'APPROVED',
      respondedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Apply changes to the appointment
    if (request.type === 'CANCELLATION') {
      await updateDoc(doc(db, 'appointments', request.appointmentId), {
        status: 'CANCELLED',
        updatedAt: Timestamp.now(),
      });
    } else if (request.type === 'MODIFICATION' && request.proposedStart && request.proposedEnd) {
      await updateDoc(doc(db, 'appointments', request.appointmentId), {
        scheduledStart: request.proposedStart,
        scheduledEnd: request.proposedEnd,
        updatedAt: Timestamp.now(),
      });
    }
  };

  const rejectRequest = async (requestId: string, responseNote: string) => {
    if (!currentUser) throw new Error('Not authenticated');

    await updateDoc(doc(db, 'appointment_requests', requestId), {
      status: 'REJECTED',
      responseNote,
      respondedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  };

  return {
    requests,
    pendingCount,
    loading,
    error,
    createRequest,
    approveRequest,
    rejectRequest,
  };
}
