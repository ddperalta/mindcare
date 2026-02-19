import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AppointmentCalendar } from '../appointments/AppointmentCalendar';
import { AppointmentFormModal } from '../appointments/AppointmentFormModal';
import { AppointmentDetailModal } from '../appointments/AppointmentDetailModal';
import { Button } from '../common';
import { useAppointments } from '../../hooks/useAppointments';
import type { Appointment } from '../../types';

interface TherapistOption {
  uid: string;
  displayName: string;
  tenantId: string;
}

interface PatientOption {
  uid: string;
  displayName: string;
}

export function AppointmentManagement() {
  const { t } = useTranslation();
  const [filterTherapistId, setFilterTherapistId] = useState('');
  const { appointments, loading, createAppointment, updateAppointment, cancelAppointment, completeAppointment } = useAppointments({
    realtime: true,
    filterTherapistId: filterTherapistId || undefined,
  });

  const [therapists, setTherapists] = useState<TherapistOption[]>([]);
  const [allPatients, setAllPatients] = useState<PatientOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Fetch therapists
  useEffect(() => {
    const fetchTherapists = async () => {
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'THERAPIST'));
      const snapshot = await getDocs(usersQuery);
      const therapistList: TherapistOption[] = [];
      for (const userDoc of snapshot.docs) {
        const data = userDoc.data();
        const therapistDoc = await getDoc(doc(db, 'therapists', userDoc.id));
        const tenantId = therapistDoc.exists() ? therapistDoc.data().tenantId : '';
        therapistList.push({
          uid: userDoc.id,
          displayName: data.displayName || data.email,
          tenantId,
        });
      }
      setTherapists(therapistList);
    };
    fetchTherapists();
  }, []);

  // Fetch all patients
  useEffect(() => {
    const fetchPatients = async () => {
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'PATIENT'));
      const snapshot = await getDocs(usersQuery);
      setAllPatients(
        snapshot.docs.map((d) => ({
          uid: d.id,
          displayName: d.data().displayName || d.data().email,
        }))
      );
    };
    fetchPatients();
  }, []);

  // Build name maps
  const patientNames = useMemo(() => {
    const map = new Map<string, string>();
    allPatients.forEach((p) => map.set(p.uid, p.displayName));
    return map;
  }, [allPatients]);

  const therapistNames = useMemo(() => {
    const map = new Map<string, string>();
    therapists.forEach((t) => map.set(t.uid, t.displayName));
    return map;
  }, [therapists]);

  const handleEventClick = (appointmentId: string) => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (apt) {
      setSelectedAppointment(apt);
      setShowDetail(true);
    }
  };

  const handleDateClick = () => {
    setEditingAppointment(null);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (editingAppointment) {
      await updateAppointment(editingAppointment.id, data);
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

  const handleComplete = async () => {
    if (selectedAppointment) {
      await completeAppointment(selectedAppointment.id);
      setShowDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with filter and new button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={filterTherapistId}
            onChange={(e) => setFilterTherapistId(e.target.value)}
            className="input-field max-w-xs"
          >
            <option value="">{t('appointments.filter.allTherapists')}</option>
            {therapists.map((th) => (
              <option key={th.uid} value={th.uid}>{th.displayName}</option>
            ))}
          </select>
        </div>
        <Button
          variant="primary"
          onClick={() => { setEditingAppointment(null); setShowForm(true); }}
        >
          {t('appointments.newAppointment')}
        </Button>
      </div>

      {/* Calendar */}
      {loading ? (
        <p className="text-sage-600">{t('common.loading')}</p>
      ) : (
        <AppointmentCalendar
          appointments={appointments}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
          patientNames={patientNames}
          therapistNames={therapistNames}
        />
      )}

      {/* Form Modal */}
      <AppointmentFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingAppointment(null); }}
        onSubmit={handleFormSubmit}
        patients={allPatients}
        appointment={editingAppointment}
        isAdmin={true}
        therapists={therapists}
      />

      {/* Detail Modal */}
      <AppointmentDetailModal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        appointment={selectedAppointment}
        patientName={patientNames.get(selectedAppointment?.patientId || '') || ''}
        therapistName={therapistNames.get(selectedAppointment?.therapistId || '')}
        role="ADMIN"
        onEdit={handleEdit}
        onCancel={handleCancel}
        onComplete={handleComplete}
      />
    </div>
  );
}
