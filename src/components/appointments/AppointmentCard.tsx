import { useTranslation } from 'react-i18next';
import type { Appointment } from '../../types';

interface AppointmentCardProps {
  appointment: Appointment;
  patientName: string;
  therapistName?: string;
  onClick?: () => void;
  showStatus?: boolean;
}

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-mint-100 text-mint-800',
  CANCELLED: 'bg-sage-200 text-sage-600',
  NO_SHOW: 'bg-coral-100 text-coral-800',
};

export function AppointmentCard({
  appointment,
  patientName,
  therapistName,
  onClick,
  showStatus = true,
}: AppointmentCardProps) {
  const { t } = useTranslation();

  const start = appointment.scheduledStart?.toDate?.() || new Date();
  const end = appointment.scheduledEnd?.toDate?.() || new Date();

  const formatDate = (date: Date) =>
    date.toLocaleDateString('es-MX', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      onClick={onClick}
      className={`p-4 border border-sage-200 rounded-xl transition-all ${
        onClick ? 'hover:border-teal-300 hover:shadow-md cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sage-900 truncate">{patientName}</h4>
            {showStatus && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[appointment.status]}`}>
                {t(`appointments.status.${appointment.status}`)}
              </span>
            )}
          </div>
          {therapistName && (
            <p className="text-sm text-sage-500 mb-1">
              {t('appointments.details.therapist')}: {therapistName}
            </p>
          )}
          <p className="text-sm text-sage-600">
            {formatDate(start)}
          </p>
          <p className="text-sm text-sage-500">
            {formatTime(start)} - {formatTime(end)}
          </p>
          {appointment.isVirtual && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full">
              {t('appointments.details.virtual')}
            </span>
          )}
          {appointment.location && !appointment.isVirtual && (
            <p className="text-xs text-sage-500 mt-1">{appointment.location}</p>
          )}
        </div>
      </div>
    </div>
  );
}
