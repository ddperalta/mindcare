import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button } from '../../components/common';
import { DashboardLayout } from '../../components/layout';
import { ROUTES } from '../../config/constants';
import { useAppointments } from '../../hooks/useAppointments';
import { AppointmentCard } from '../../components/appointments/AppointmentCard';

export function PatientDashboard() {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { appointments } = useAppointments({ realtime: true });

  const now = new Date();
  const nextAppointment = useMemo(() =>
    appointments.find(
      (a) => a.status === 'SCHEDULED' && (a.scheduledStart?.toDate?.() || new Date(0)) >= now
    )
  , [appointments]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-sage-900 mb-6 sm:mb-8">
          {t('dashboard.patient.welcome', { name: userProfile?.displayName })}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card elevated>
            <h2 className="text-2xl font-semibold text-sage-900 mb-4">
              {t('dashboard.patient.nextAppointment')}
            </h2>
            {nextAppointment ? (
              <AppointmentCard
                appointment={nextAppointment}
                patientName={nextAppointment.therapistId}
                onClick={() => navigate(ROUTES.PATIENT_APPOINTMENTS)}
              />
            ) : (
              <p className="text-sage-600">{t('dashboard.patient.noUpcomingAppointments')}</p>
            )}
          </Card>

          <Card elevated>
            <h2 className="text-2xl font-semibold text-sage-900 mb-4">
              {t('dashboard.patient.pendingTests')}
            </h2>
            <p className="text-sage-600">{t('dashboard.patient.noPendingTests')}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card elevated>
            <h2 className="text-2xl font-semibold text-sage-900 mb-4">
              {t('dashboard.patient.recentActivity')}
            </h2>
            <p className="text-sage-600">{t('dashboard.patient.noRecentActivity')}</p>
          </Card>

          <Card elevated>
            <h2 className="text-2xl font-semibold text-sage-900 mb-4">
              Acciones Rápidas
            </h2>
            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={() => navigate(ROUTES.PATIENT_APPOINTMENTS)}
                className="w-full"
              >
                📅 Mis Citas
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(ROUTES.PATIENT_TESTS)}
                className="w-full"
              >
                📝 Mis Evaluaciones
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(ROUTES.PATIENT_PROFILE)}
                className="w-full"
              >
                👤 Mi Perfil
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
