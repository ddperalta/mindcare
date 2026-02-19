import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
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
import { sendNotification } from '../services/notifications';
import type { Appointment, AppointmentFormData, AuditEntry } from '../types';

interface UseAppointmentsOptions {
  realtime?: boolean;
  filterTherapistId?: string;
}

export function useAppointments(options: UseAppointmentsOptions = {}) {
  const { realtime = false, filterTherapistId } = options;
  const { currentUser, customClaims } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQuery = useCallback(() => {
    const col = collection(db, 'appointments');
    const role = customClaims?.role;

    if (role === 'ADMIN') {
      if (filterTherapistId) {
        return query(col, where('therapistId', '==', filterTherapistId), orderBy('scheduledStart', 'asc'));
      }
      return query(col, orderBy('scheduledStart', 'asc'));
    }

    if (role === 'THERAPIST') {
      return query(col, where('therapistId', '==', currentUser!.uid), orderBy('scheduledStart', 'asc'));
    }

    if (role === 'PATIENT') {
      return query(col, where('patientId', '==', currentUser!.uid), orderBy('scheduledStart', 'asc'));
    }

    return null;
  }, [currentUser, customClaims, filterTherapistId]);

  const parseAppointments = (snapshot: { docs: any[] }) => {
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
  };

  const fetchAppointments = useCallback(async () => {
    if (!currentUser || !customClaims) return;
    setLoading(true);
    setError(null);
    try {
      const q = buildQuery();
      if (!q) return;
      const snapshot = await getDocs(q);
      setAppointments(parseAppointments(snapshot));
    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser, customClaims, buildQuery]);

  useEffect(() => {
    if (!currentUser || !customClaims) return;

    let unsubscribe: Unsubscribe | undefined;

    if (realtime) {
      const q = buildQuery();
      if (!q) return;
      setLoading(true);
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setAppointments(parseAppointments(snapshot));
          setLoading(false);
        },
        (err) => {
          console.error('Appointments snapshot error:', err);
          setError(err.message);
          setLoading(false);
        }
      );
    } else {
      fetchAppointments();
    }

    return () => {
      unsubscribe?.();
    };
  }, [currentUser, customClaims, realtime, buildQuery]);

  const createAppointment = async (data: AppointmentFormData & { therapistId?: string; tenantId?: string; sessionPrice?: number; bankInfo?: { bankName: string; clabe: string; accountHolder: string } }) => {
    if (!currentUser) throw new Error('Not authenticated');

    const therapistId = data.therapistId || currentUser.uid;
    const tenantId = data.tenantId || customClaims?.tenantId || '';

    const auditEntry: AuditEntry = {
      timestamp: Timestamp.now(),
      userId: currentUser.uid,
      action: 'CREATE',
    };

    const appointmentData: any = {
      therapistId,
      patientId: data.patientId,
      tenantId,
      scheduledStart: Timestamp.fromDate(data.scheduledStart),
      scheduledEnd: Timestamp.fromDate(data.scheduledEnd),
      status: 'SCHEDULED',
      notes: data.notes || '',
      location: data.location || '',
      isVirtual: data.isVirtual || false,
      meetingLink: data.meetingLink || '',
      isDeleted: false,
      auditLog: [auditEntry],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    if (data.sessionPrice) appointmentData.sessionPrice = data.sessionPrice;
    if (data.bankInfo?.bankName) {
      appointmentData.bankInfo = data.bankInfo;
      appointmentData.paymentStatus = 'PENDING';
    }

    const docRef = await addDoc(collection(db, 'appointments'), appointmentData);
    return docRef.id;
  };

  const updateAppointment = async (id: string, updates: Partial<AppointmentFormData> & { status?: string }) => {
    if (!currentUser) throw new Error('Not authenticated');

    const updateData: any = { updatedAt: Timestamp.now() };

    if (updates.scheduledStart) updateData.scheduledStart = Timestamp.fromDate(updates.scheduledStart);
    if (updates.scheduledEnd) updateData.scheduledEnd = Timestamp.fromDate(updates.scheduledEnd);
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.isVirtual !== undefined) updateData.isVirtual = updates.isVirtual;
    if (updates.meetingLink !== undefined) updateData.meetingLink = updates.meetingLink;
    if (updates.status) updateData.status = updates.status;

    await updateDoc(doc(db, 'appointments', id), updateData);
  };

  const cancelAppointment = async (id: string) => {
    await updateAppointment(id, { status: 'CANCELLED' });
  };

  const uncancelAppointment = async (id: string) => {
    const appointment = appointments.find(a => a.id === id);
    await updateAppointment(id, { status: 'SCHEDULED' });
    if (appointment) {
      await sendNotification(
        appointment.patientId,
        'APPOINTMENT_UNCANCELLED',
        id,
        'Tu cita ha sido reactivada por tu terapeuta.'
      );
    }
  };

  const completeAppointment = async (id: string) => {
    await updateAppointment(id, { status: 'COMPLETED' });
  };

  const markNoShow = async (id: string) => {
    await updateAppointment(id, { status: 'NO_SHOW' });
  };

  return {
    appointments,
    loading,
    error,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    uncancelAppointment,
    completeAppointment,
    markNoShow,
  };
}
