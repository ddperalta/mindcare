import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Input, BankSelector } from '../common';
import type { Appointment } from '../../types';

interface PatientOption {
  uid: string;
  displayName: string;
}

interface TherapistOption {
  uid: string;
  displayName: string;
  tenantId: string;
}

interface BankInfoData {
  bankName: string;
  clabe: string;
  accountHolder: string;
}

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  patients: PatientOption[];
  preselectedPatientId?: string;
  appointment?: Appointment | null;
  isAdmin?: boolean;
  therapists?: TherapistOption[];
  therapistBankInfo?: BankInfoData | null;
}

export function AppointmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  patients,
  preselectedPatientId,
  appointment,
  isAdmin = false,
  therapists = [],
  therapistBankInfo,
}: AppointmentFormModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [patientId, setPatientId] = useState('');
  const [therapistId, setTherapistId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [sessionPrice, setSessionPrice] = useState('');
  const [bankName, setBankName] = useState('');
  const [clabe, setClabe] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const isEditing = !!appointment;

  useEffect(() => {
    if (appointment) {
      const start = appointment.scheduledStart?.toDate?.() || new Date();
      const end = appointment.scheduledEnd?.toDate?.() || new Date();
      setPatientId(appointment.patientId);
      setDate(start.toISOString().split('T')[0]);
      setStartTime(start.toTimeString().slice(0, 5));
      setEndTime(end.toTimeString().slice(0, 5));
      setLocation(appointment.location || '');
      setIsVirtual(appointment.isVirtual || false);
      setMeetingLink(appointment.meetingLink || '');
      setNotes(appointment.notes || '');
      setSessionPrice(appointment.sessionPrice?.toString() || '');
      setBankName(appointment.bankInfo?.bankName || therapistBankInfo?.bankName || '');
      setClabe(appointment.bankInfo?.clabe || therapistBankInfo?.clabe || '');
      setAccountHolder(appointment.bankInfo?.accountHolder || therapistBankInfo?.accountHolder || '');
      if (isAdmin) setTherapistId(appointment.therapistId);
    } else {
      setPatientId(preselectedPatientId || '');
      setTherapistId('');
      setDate('');
      setStartTime('09:00');
      setEndTime('10:00');
      setLocation('');
      setIsVirtual(false);
      setMeetingLink('');
      setNotes('');
      setSessionPrice('');
      setBankName(therapistBankInfo?.bankName || '');
      setClabe(therapistBankInfo?.clabe || '');
      setAccountHolder(therapistBankInfo?.accountHolder || '');
    }
  }, [appointment, preselectedPatientId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !date || !startTime || !endTime) return;
    if (isAdmin && !therapistId) return;

    setLoading(true);
    setError('');

    try {
      const scheduledStart = new Date(`${date}T${startTime}:00`);
      const scheduledEnd = new Date(`${date}T${endTime}:00`);

      if (scheduledEnd <= scheduledStart) {
        setError('La hora de fin debe ser posterior a la hora de inicio');
        setLoading(false);
        return;
      }

      const selectedTherapist = therapists.find(t => t.uid === therapistId);

      await onSubmit({
        patientId,
        scheduledStart,
        scheduledEnd,
        location,
        isVirtual,
        meetingLink: isVirtual ? meetingLink : '',
        notes,
        ...(isVirtual && sessionPrice ? {
          sessionPrice: parseFloat(sessionPrice),
          bankInfo: bankName ? { bankName, clabe, accountHolder } : undefined,
        } : {}),
        ...(isAdmin && therapistId ? { therapistId, tenantId: selectedTherapist?.tenantId } : {}),
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('appointments.editAppointment') : t('appointments.newAppointment')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={loading}
          >
            {isEditing ? t('common.save') : t('appointments.newAppointment')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-coral-600 bg-coral-50 p-3 rounded-lg">{error}</p>}

        {isAdmin && (
          <div>
            <label className="label">{t('appointments.form.selectTherapist')}</label>
            <select
              value={therapistId}
              onChange={(e) => setTherapistId(e.target.value)}
              className="input-field"
              required
            >
              <option value="">{t('appointments.form.selectTherapist')}</option>
              {therapists.map((th) => (
                <option key={th.uid} value={th.uid}>{th.displayName}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label">{t('appointments.form.selectPatient')}</label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="input-field"
            required
          >
            <option value="">{t('appointments.form.selectPatient')}</option>
            {patients.map((p) => (
              <option key={p.uid} value={p.uid}>{p.displayName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">{t('appointments.form.date')}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t('appointments.form.startTime')}</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input-field"
              min="07:00"
              max="22:00"
              required
            />
          </div>
          <div>
            <label className="label">{t('appointments.form.endTime')}</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="input-field"
              min="07:00"
              max="22:00"
              required
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isVirtual}
              onChange={(e) => setIsVirtual(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded"
            />
            <span className="text-sm font-medium text-sage-700">{t('appointments.form.isVirtual')}</span>
          </label>
        </div>

        {isVirtual && (
          <>
            <Input
              label={t('appointments.details.meetingLink')}
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder={t('appointments.details.meetingLinkPlaceholder')}
            />
            <Input
              label="Precio de la sesión (MXN)"
              type="number"
              value={sessionPrice}
              onChange={(e) => setSessionPrice(e.target.value)}
              placeholder="Ej: 800"
              min={0}
            />
            <div className="p-3 bg-sage-50 rounded-lg space-y-3">
              <p className="text-sm font-medium text-sage-700">Datos bancarios para transferencia</p>
              <BankSelector
                value={bankName}
                onChange={(bank: string) => setBankName(bank)}
                label="Banco"
                placeholder="Selecciona un banco"
              />
              <Input
                label="CLABE (18 dígitos)"
                value={clabe}
                onChange={(e) => setClabe(e.target.value)}
                placeholder="012345678901234567"
                maxLength={18}
              />
              <Input
                label="Titular"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="Nombre del titular"
              />
            </div>
          </>
        )}

        {!isVirtual && (
          <Input
            label={t('appointments.details.location')}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('appointments.details.locationPlaceholder')}
          />
        )}

        <div>
          <label className="label">{t('appointments.details.notes')}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('appointments.details.notesPlaceholder')}
            className="input-field min-h-[80px] resize-y"
            rows={3}
          />
        </div>
      </form>
    </Modal>
  );
}
