import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from '../common';
import type { Appointment, AppointmentRequestType } from '../../types';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    appointmentId: string,
    type: AppointmentRequestType,
    reason: string,
    proposedStart?: Date,
    proposedEnd?: Date
  ) => Promise<string | void>;
  appointment: Appointment | null;
  type: AppointmentRequestType;
}

export function RequestModal({
  isOpen,
  onClose,
  onSubmit,
  appointment,
  type,
}: RequestModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [proposedStartTime, setProposedStartTime] = useState('09:00');
  const [proposedEndTime, setProposedEndTime] = useState('10:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!appointment) return null;

  const isModification = type === 'MODIFICATION';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setLoading(true);
    setError('');

    try {
      let proposedStart: Date | undefined;
      let proposedEnd: Date | undefined;

      if (isModification && proposedDate) {
        proposedStart = new Date(`${proposedDate}T${proposedStartTime}:00`);
        proposedEnd = new Date(`${proposedDate}T${proposedEndTime}:00`);

        if (proposedEnd <= proposedStart) {
          setError('La hora de fin debe ser posterior a la hora de inicio');
          setLoading(false);
          return;
        }
      }

      await onSubmit(appointment.id, type, reason, proposedStart, proposedEnd);
      setReason('');
      setProposedDate('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const title = isModification
    ? t('appointments.actions.requestModification')
    : t('appointments.actions.requestCancellation');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            {t('common.submit')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-coral-600 bg-coral-50 p-3 rounded-lg">{error}</p>}

        <div>
          <p className="text-sm text-sage-600 mb-3">
            {isModification
              ? t('appointments.requests.modification')
              : t('appointments.requests.cancellation')}
            {' - '}
            {(appointment.scheduledStart?.toDate?.() || new Date()).toLocaleDateString('es-MX', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        <div>
          <label className="label">{t('appointments.requests.reason')}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('appointments.requests.reasonPlaceholder')}
            className="input-field min-h-[80px] resize-y"
            rows={3}
            required
          />
        </div>

        {isModification && (
          <>
            <div>
              <label className="label">{t('appointments.requests.proposedTime')}</label>
              <input
                type="date"
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{t('appointments.form.startTime')}</label>
                <input
                  type="time"
                  value={proposedStartTime}
                  onChange={(e) => setProposedStartTime(e.target.value)}
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
                  value={proposedEndTime}
                  onChange={(e) => setProposedEndTime(e.target.value)}
                  className="input-field"
                  min="07:00"
                  max="22:00"
                  required
                />
              </div>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
