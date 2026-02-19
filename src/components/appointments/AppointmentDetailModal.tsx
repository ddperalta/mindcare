import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from '../common';
import type { Appointment } from '../../types';
import { usePaymentUpload } from '../../hooks/usePaymentUpload';

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  patientName: string;
  therapistName?: string;
  role: 'THERAPIST' | 'PATIENT' | 'ADMIN';
  onEdit?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
  onMarkNoShow?: () => void;
  onRequestModification?: () => void;
  onRequestCancellation?: () => void;
  onPaymentUpdated?: () => void;
  onUncancel?: () => void;
}

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-mint-100 text-mint-800',
  CANCELLED: 'bg-sage-200 text-sage-600',
  NO_SHOW: 'bg-coral-100 text-coral-800',
};

export function AppointmentDetailModal({
  isOpen,
  onClose,
  appointment,
  patientName,
  therapistName,
  role,
  onEdit,
  onCancel,
  onComplete,
  onMarkNoShow,
  onRequestModification,
  onRequestCancellation,
  onPaymentUpdated,
  onUncancel,
}: AppointmentDetailModalProps) {
  const { t } = useTranslation();
  const { uploadReceipt, confirmPayment, uploading, confirming } = usePaymentUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [paymentError, setPaymentError] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  if (!appointment) return null;

  const start = appointment.scheduledStart?.toDate?.() || new Date();
  const end = appointment.scheduledEnd?.toDate?.() || new Date();

  const formatDate = (date: Date) =>
    date.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const isScheduled = appointment.status === 'SCHEDULED';

  const actionButtons = () => {
    if (role === 'THERAPIST') {
      if (appointment.status === 'CANCELLED') {
        return (
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={onUncancel} className="text-sm !bg-green-600 hover:!bg-green-700">
              ↩ Reactivar Cita
            </Button>
            <Button variant="secondary" onClick={onEdit} className="text-sm">
              {t('appointments.actions.edit')}
            </Button>
          </div>
        );
      }

      if (!isScheduled) return null;

      return (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onEdit} className="text-sm">
            {t('appointments.actions.edit')}
          </Button>
          <Button variant="ghost" onClick={onComplete} className="text-sm text-mint-600 hover:bg-mint-50">
            {t('appointments.actions.complete')}
          </Button>
          <Button variant="ghost" onClick={onMarkNoShow} className="text-sm text-coral-600 hover:bg-coral-50">
            {t('appointments.actions.markNoShow')}
          </Button>
          <Button variant="ghost" onClick={onCancel} className="text-sm text-coral-600 hover:bg-coral-50">
            {t('appointments.actions.cancel')}
          </Button>
        </div>
      );
    }

    if (!isScheduled) return null;

    if (role === 'PATIENT') {
      return (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onRequestModification} className="text-sm">
            {t('appointments.actions.requestModification')}
          </Button>
          <Button variant="ghost" onClick={onRequestCancellation} className="text-sm text-coral-600 hover:bg-coral-50">
            {t('appointments.actions.requestCancellation')}
          </Button>
        </div>
      );
    }

    if (role === 'ADMIN') {
      return (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onEdit} className="text-sm">
            {t('appointments.actions.edit')}
          </Button>
          <Button variant="ghost" onClick={onComplete} className="text-sm text-mint-600 hover:bg-mint-50">
            {t('appointments.actions.complete')}
          </Button>
          <Button variant="ghost" onClick={onCancel} className="text-sm text-coral-600 hover:bg-coral-50">
            {t('appointments.actions.cancel')}
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('appointments.title')}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusColors[appointment.status]}`}>
            {t(`appointments.status.${appointment.status}`)}
          </span>
          {appointment.isVirtual && (
            <span className="text-sm px-3 py-1 rounded-full font-medium bg-teal-50 text-teal-700">
              {t('appointments.details.virtual')}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-sage-500 uppercase">{t('appointments.details.patient')}</p>
            <p className="text-sage-900 font-medium">{patientName}</p>
          </div>
          {therapistName && (
            <div>
              <p className="text-xs font-medium text-sage-500 uppercase">{t('appointments.details.therapist')}</p>
              <p className="text-sage-900 font-medium">{therapistName}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-sage-500 uppercase">{t('appointments.details.date')}</p>
            <p className="text-sage-900">{formatDate(start)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-sage-500 uppercase">{t('appointments.details.time')}</p>
            <p className="text-sage-900">{formatTime(start)} - {formatTime(end)}</p>
          </div>
          {appointment.location && !appointment.isVirtual && (
            <div>
              <p className="text-xs font-medium text-sage-500 uppercase">{t('appointments.details.location')}</p>
              <p className="text-sage-900">{appointment.location}</p>
            </div>
          )}
          {appointment.isVirtual && appointment.meetingLink && (
            <div>
              <p className="text-xs font-medium text-sage-500 uppercase">{t('appointments.details.meetingLink')}</p>
              <a
                href={appointment.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:underline text-sm break-all"
              >
                {appointment.meetingLink}
              </a>
            </div>
          )}
        </div>

        {appointment.notes && (
          <div>
            <p className="text-xs font-medium text-sage-500 uppercase mb-1">{t('appointments.details.notes')}</p>
            <p className="text-sage-700 text-sm bg-sage-50 p-3 rounded-lg">{appointment.notes}</p>
          </div>
        )}

        {/* Payment Section for Virtual Appointments */}
        {appointment.isVirtual && (appointment.sessionPrice || appointment.bankInfo) && (
          <div className="p-4 bg-sage-50 rounded-xl space-y-3">
            <p className="text-sm font-semibold text-sage-800">Información de Pago</p>

            {appointment.sessionPrice && (
              <div>
                <p className="text-xs text-sage-500">Precio de sesión</p>
                <p className="text-lg font-bold text-sage-900">${appointment.sessionPrice.toLocaleString('es-MX')} MXN</p>
              </div>
            )}

            {appointment.bankInfo && (
              <div className="space-y-1">
                <p className="text-xs text-sage-500">Datos de transferencia</p>
                <p className="text-sm text-sage-800">Banco: <strong>{appointment.bankInfo.bankName}</strong></p>
                <p className="text-sm text-sage-800">CLABE: <strong className="font-mono">{appointment.bankInfo.clabe}</strong></p>
                <p className="text-sm text-sage-800">Titular: <strong>{appointment.bankInfo.accountHolder}</strong></p>
              </div>
            )}

            {/* Payment Status */}
            {appointment.paymentStatus && (
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  appointment.paymentStatus === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                  appointment.paymentStatus === 'PROOF_UPLOADED' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {appointment.paymentStatus === 'CONFIRMED' ? 'Pago Confirmado' :
                   appointment.paymentStatus === 'PROOF_UPLOADED' ? 'Comprobante Enviado' :
                   'Pago Pendiente'}
                </span>
              </div>
            )}

            {paymentError && (
              <p className="text-sm text-coral-600">{paymentError}</p>
            )}

            {/* Patient: Upload receipt */}
            {role === 'PATIENT' && appointment.paymentStatus !== 'CONFIRMED' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPaymentError('');
                    try {
                      await uploadReceipt(appointment.id, file);
                      onPaymentUpdated?.();
                    } catch (err: any) {
                      setPaymentError(err.message);
                    }
                  }}
                />
                <Button
                  variant="primary"
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={uploading}
                  className={`text-sm w-full ${
                    appointment.paymentStatus === 'PROOF_UPLOADED'
                      ? '!bg-green-600 hover:!bg-green-700'
                      : ''
                  }`}
                >
                  {appointment.paymentStatus === 'PROOF_UPLOADED' ? '✓ Comprobante Enviado' : 'Subir Comprobante'}
                </Button>
              </div>
            )}

            {/* Therapist: View receipt + confirm */}
            {role === 'THERAPIST' && appointment.paymentProofUrl && (
              <div className="space-y-2">
                <a
                  href={appointment.paymentProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-teal-600 hover:underline"
                >
                  Ver comprobante de pago
                </a>
                {(appointment.paymentStatus === 'PROOF_UPLOADED' || paymentConfirmed) && (
                  <Button
                    variant="primary"
                    disabled={paymentConfirmed}
                    isLoading={confirming}
                    onClick={async () => {
                      setPaymentError('');
                      try {
                        await confirmPayment(appointment.id);
                        setPaymentConfirmed(true);
                        onPaymentUpdated?.();
                      } catch (err: any) {
                        setPaymentError(err.message);
                      }
                    }}
                    className={`text-sm w-full ${paymentConfirmed ? '!bg-green-600' : ''}`}
                  >
                    {paymentConfirmed ? '✓ Pago Confirmado' : 'Confirmar Pago'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-sage-200 space-y-3">
          {actionButtons()}
          <Button variant="ghost" onClick={onClose} className="w-full text-sage-500">
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
