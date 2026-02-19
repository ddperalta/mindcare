import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { sendNotification } from '../../services/notifications';
import { DashboardLayout } from '../../components/layout';
import { Button } from '../../components/common';
import { AppointmentCalendar } from '../../components/appointments/AppointmentCalendar';
import { AppointmentFormModal } from '../../components/appointments/AppointmentFormModal';
import { AppointmentDetailModal } from '../../components/appointments/AppointmentDetailModal';
import { RequestList } from '../../components/appointments/RequestList';
import { useAppointments } from '../../hooks/useAppointments';
import { useAppointmentRequests } from '../../hooks/useAppointmentRequests';
import type { Appointment } from '../../types';

interface PatientOption {
  uid: string;
  displayName: string;
}

export function TherapistAppointments() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get('patientId') || undefined;

  const { appointments, loading, createAppointment, updateAppointment, cancelAppointment, uncancelAppointment, completeAppointment, markNoShow } = useAppointments({ realtime: true });
  const { requests, pendingCount, approveRequest, rejectRequest } = useAppointmentRequests();

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [therapistBankInfo, setTherapistBankInfo] = useState<{ bankName: string; clabe: string; accountHolder: string } | null>(null);
  const [showForm, setShowForm] = useState(!!preselectedPatientId);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Build patient names map
  const patientNames = useMemo(() => {
    const map = new Map<string, string>();
    patients.forEach((p) => map.set(p.uid, p.displayName));
    return map;
  }, [patients]);

  // Fetch patients for form dropdown
  useEffect(() => {
    if (!currentUser) return;
    const fetchPatients = async () => {
      const relQuery = query(
        collection(db, 'therapist_patients'),
        where('therapistId', '==', currentUser.uid),
        where('status', '==', 'ACTIVE')
      );
      const relSnapshot = await getDocs(relQuery);
      const patientPromises = relSnapshot.docs.map(async (relDoc) => {
        const patientId = relDoc.data().patientId;
        const userDoc = await getDoc(doc(db, 'users', patientId));
        if (userDoc.exists()) {
          return { uid: patientId, displayName: userDoc.data().displayName || 'Sin nombre' };
        }
        return null;
      });
      const results = await Promise.all(patientPromises);
      setPatients(results.filter(Boolean) as PatientOption[]);
    };
    fetchPatients();

    // Fetch therapist bank info
    const fetchBankInfo = async () => {
      const therapistDoc = await getDoc(doc(db, 'therapists', currentUser.uid));
      if (therapistDoc.exists()) {
        const data = therapistDoc.data();
        if (data.bankInfo?.bankName) {
          setTherapistBankInfo(data.bankInfo);
        }
      }
    };
    fetchBankInfo();
  }, [currentUser]);

  const handleEventClick = (appointmentId: string) => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (apt) {
      setSelectedAppointment(apt);
      setShowDetail(true);
    }
  };

  const handleDateClick = (_date: Date) => {
    setEditingAppointment(null);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (editingAppointment) {
      await updateAppointment(editingAppointment.id, data);
      await sendNotification(
        editingAppointment.patientId,
        'APPOINTMENT_UPDATED',
        editingAppointment.id,
        'Tu terapeuta ha actualizado los detalles de tu cita.'
      );
    } else {
      await createAppointment(data);
    }
  };

  const handleEdit = () => {
    setShowDetail(false);
    setEditingAppointment(selectedAppointment);
    setShowForm(true);
  };

  const handleCancel = async () => {
    if (selectedAppointment) {
      await cancelAppointment(selectedAppointment.id);
      setShowDetail(false);
    }
  };

  const handleUncancel = async () => {
    if (selectedAppointment) {
      await uncancelAppointment(selectedAppointment.id);
      setShowDetail(false);
    }
  };

  const handleComplete = async () => {
    if (selectedAppointment) {
      await completeAppointment(selectedAppointment.id);
      setShowDetail(false);
    }
  };

  const handleMarkNoShow = async () => {
    if (selectedAppointment) {
      await markNoShow(selectedAppointment.id);
      setShowDetail(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-sage-900">
            {t('appointments.title')}
          </h1>
          <Button
            variant="primary"
            onClick={() => { setEditingAppointment(null); setShowForm(true); }}
          >
            {t('appointments.newAppointment')}
          </Button>
        </div>

        {/* Pending requests banner */}
        {pendingCount > 0 && (
          <RequestList
            requests={requests}
            patientNames={patientNames}
            onApprove={approveRequest}
            onReject={rejectRequest}
          />
        )}

        {/* Calendar */}
        {loading ? (
          <p className="text-sage-600">{t('common.loading')}</p>
        ) : (
          <AppointmentCalendar
            appointments={appointments}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            patientNames={patientNames}
          />
        )}

        {/* Form Modal */}
        <AppointmentFormModal
          isOpen={showForm}
          onClose={() => { setShowForm(false); setEditingAppointment(null); }}
          onSubmit={handleFormSubmit}
          patients={patients}
          preselectedPatientId={preselectedPatientId}
          appointment={editingAppointment}
          therapistBankInfo={therapistBankInfo}
        />

        {/* Detail Modal */}
        <AppointmentDetailModal
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          appointment={selectedAppointment}
          patientName={patientNames.get(selectedAppointment?.patientId || '') || ''}
          role="THERAPIST"
          onEdit={handleEdit}
          onCancel={handleCancel}
          onUncancel={handleUncancel}
          onComplete={handleComplete}
          onMarkNoShow={handleMarkNoShow}
        />
      </div>
    </DashboardLayout>
  );
}
