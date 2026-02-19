import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button } from '../../components/common';
import { DashboardLayout } from '../../components/layout';
import { ROUTES } from '../../config/constants';
import { useAppointments } from '../../hooks/useAppointments';
import { AppointmentCard } from '../../components/appointments/AppointmentCard';

export function TherapistDashboard() {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { appointments } = useAppointments({ realtime: true });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const todayCount = useMemo(() =>
    appointments.filter((a) => {
      const start = a.scheduledStart?.toDate?.() || new Date(0);
      return a.status === 'SCHEDULED' && start >= todayStart && start < todayEnd;
    }).length
  , [appointments]);

  const upcomingAppointments = useMemo(() =>
    appointments
      .filter((a) => a.status === 'SCHEDULED' && (a.scheduledStart?.toDate?.() || new Date(0)) >= now)
      .slice(0, 3)
  , [appointments]);

  // Simple patient name map (just show IDs for dashboard; full names resolved in appointments page)
  const patientNames = useMemo(() => new Map<string, string>(), []);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-sage-900 mb-6 sm:mb-8">
          {t('dashboard.therapist.welcome', { name: userProfile?.displayName })}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <h3 className="text-lg font-semibold text-sage-700 mb-2">
              {t('dashboard.therapist.totalPatients')}
            </h3>
            <p className="text-4xl font-bold text-teal-600">0</p>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-sage-700 mb-2">
              {t('dashboard.therapist.appointmentsToday')}
            </h3>
            <p className="text-4xl font-bold text-mint-600">{todayCount}</p>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-sage-700 mb-2">
              {t('dashboard.therapist.pendingTests')}
            </h3>
            <p className="text-4xl font-bold text-coral-600">0</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card elevated>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-sage-900">
                {t('dashboard.therapist.upcomingAppointments')}
              </h2>
              {appointments.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => navigate(ROUTES.THERAPIST_APPOINTMENTS)}
                  className="text-sm text-teal-600"
                >
                  {t('appointments.viewAll')}
                </Button>
              )}
            </div>
            {upcomingAppointments.length === 0 ? (
              <p className="text-sage-600">{t('dashboard.therapist.noAppointments')}</p>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    patientName={patientNames.get(apt.patientId) || apt.patientId}
                    onClick={() => navigate(ROUTES.THERAPIST_APPOINTMENTS)}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card elevated>
            <h2 className="text-2xl font-semibold text-sage-900 mb-4">
              Acciones Rápidas
            </h2>
            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={() => navigate(ROUTES.THERAPIST_PATIENTS)}
                className="w-full"
              >
                👥 Ver Pacientes
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(ROUTES.THERAPIST_APPOINTMENTS)}
                className="w-full"
              >
                📅 Ver Citas
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(ROUTES.THERAPIST_TESTS)}
                className="w-full"
              >
                📝 Mis Tests
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(ROUTES.THERAPIST_TEST_CREATE)}
                className="w-full"
              >
                ➕ Crear Nuevo Test
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
