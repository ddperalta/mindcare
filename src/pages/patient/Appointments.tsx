import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useNotifications } from '../../hooks/useNotifications';
import { DashboardLayout } from '../../components/layout';
import { AppointmentCard } from '../../components/appointments/AppointmentCard';
import { AppointmentDetailModal } from '../../components/appointments/AppointmentDetailModal';
import { RequestModal } from '../../components/appointments/RequestModal';
import { useAppointments } from '../../hooks/useAppointments';
import { useAppointmentRequests } from '../../hooks/useAppointmentRequests';
import type { Appointment, AppointmentRequestType } from '../../types';

type TabType = 'upcoming' | 'past' | 'requests';

export function PatientAppointments() {
  const { t } = useTranslation();
  const { appointments, loading } = useAppointments({ realtime: true });
  const { requests, createRequest } = useAppointmentRequests();
  const { notifications, unreadCount, markAllRead } = useNotifications();

  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [showDetail, setShowDetail] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [requestType, setRequestType] = useState<AppointmentRequestType>('CANCELLATION');
  const [therapistNames, setTherapistNames] = useState<Map<string, string>>(new Map());
  const [requestError, setRequestError] = useState('');

  // Fetch therapist names for display
  useEffect(() => {
    const therapistIds = [...new Set(appointments.map((a) => a.therapistId))];
    const fetchNames = async () => {
      const map = new Map<string, string>();
      await Promise.all(
        therapistIds.map(async (id) => {
          const userDoc = await getDoc(doc(db, 'users', id));
          if (userDoc.exists()) {
            map.set(id, userDoc.data().displayName || 'Terapeuta');
          }
        })
      );
      setTherapistNames(map);
    };
    if (therapistIds.length > 0) fetchNames();
  }, [appointments]);

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => a.status === 'SCHEDULED' && (a.scheduledStart?.toDate?.() || new Date()) >= now
  );
  const past = appointments.filter(
    (a) => a.status !== 'SCHEDULED' || (a.scheduledStart?.toDate?.() || new Date()) < now
  );

  const handleCardClick = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setShowDetail(true);
  };

  const handleRequestModification = () => {
    setRequestError('');
    setRequestType('MODIFICATION');
    setShowDetail(false);
    // Delay to ensure detail modal unmounts before request modal mounts
    setTimeout(() => setShowRequest(true), 100);
  };

  const handleRequestCancellation = () => {
    setRequestError('');
    setRequestType('CANCELLATION');
    setShowDetail(false);
    setTimeout(() => setShowRequest(true), 100);
  };

  const handleCreateRequest = async (
    appointmentId: string,
    type: AppointmentRequestType,
    reason: string,
    proposedStart?: Date,
    proposedEnd?: Date
  ) => {
    try {
      await createRequest(appointmentId, type, reason, proposedStart, proposedEnd);
    } catch (err: any) {
      console.error('Error creating request:', err);
      setRequestError(err.message || 'Error al enviar la solicitud');
      throw err;
    }
  };

  const requestStatusColors: Record<string, string> = {
    PENDING: 'bg-teal-100 text-teal-800',
    APPROVED: 'bg-mint-100 text-mint-800',
    REJECTED: 'bg-coral-100 text-coral-800',
  };

  const tabs = [
    { id: 'upcoming' as const, label: t('appointments.upcoming'), count: upcoming.length },
    { id: 'past' as const, label: t('appointments.past'), count: past.length },
    { id: 'requests' as const, label: t('appointments.myRequests'), count: requests.length },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-sage-900 mb-6">
          {t('appointments.myAppointments')}
        </h1>

        {/* Notifications */}
        {unreadCount > 0 && (
          <div className="mb-4 p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-teal-800">
                🔔 {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''} nueva{unreadCount !== 1 ? 's' : ''}
              </p>
              <button
                onClick={markAllRead}
                className="text-xs text-teal-600 hover:text-teal-800 underline"
              >
                Marcar como leídas
              </button>
            </div>
            {notifications.filter(n => !n.isRead).map(n => (
              <p key={n.id} className="text-sm text-teal-700">• {n.message}</p>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-sage-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold transition-all whitespace-nowrap text-sm ${
                activeTab === tab.id
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-sage-600 hover:text-sage-900'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <p className="text-sage-600">{t('common.loading')}</p>
        ) : (
          <>
            {activeTab === 'upcoming' && (
              <div className="space-y-3">
                {upcoming.length === 0 ? (
                  <p className="text-sage-600">{t('appointments.noUpcoming')}</p>
                ) : (
                  upcoming.map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      patientName={therapistNames.get(apt.therapistId) || 'Terapeuta'}
                      onClick={() => handleCardClick(apt)}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'past' && (
              <div className="space-y-3">
                {past.length === 0 ? (
                  <p className="text-sage-600">{t('appointments.noPast')}</p>
                ) : (
                  [...past].reverse().map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      patientName={therapistNames.get(apt.therapistId) || 'Terapeuta'}
                      onClick={() => handleCardClick(apt)}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-3">
                {requests.length === 0 ? (
                  <p className="text-sage-600">{t('appointments.noRequests')}</p>
                ) : (
                  requests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 border border-sage-200 rounded-xl"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          req.type === 'MODIFICATION'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-coral-100 text-coral-800'
                        }`}>
                          {t(`appointments.requests.${req.type.toLowerCase()}`)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${requestStatusColors[req.status]}`}>
                          {t(`appointments.requests.status.${req.status}`)}
                        </span>
                      </div>
                      <p className="text-sm text-sage-700">{req.reason}</p>
                      {req.responseNote && (
                        <p className="text-sm text-sage-500 mt-1 italic">{req.responseNote}</p>
                      )}
                      <p className="text-xs text-sage-400 mt-2">
                        {(req.createdAt?.toDate?.() || new Date()).toLocaleDateString('es-MX', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* Detail Modal */}
        <AppointmentDetailModal
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          appointment={selectedAppointment}
          patientName={therapistNames.get(selectedAppointment?.therapistId || '') || 'Terapeuta'}
          role="PATIENT"
          onRequestModification={handleRequestModification}
          onRequestCancellation={handleRequestCancellation}
        />

        {/* Request Error */}
        {requestError && (
          <div className="fixed bottom-4 right-4 z-50 bg-coral-50 border border-coral-200 text-coral-700 px-4 py-3 rounded-xl shadow-lg max-w-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm">{requestError}</p>
              <button onClick={() => setRequestError('')} className="ml-2 text-coral-500 hover:text-coral-700">
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Request Modal */}
        <RequestModal
          isOpen={showRequest}
          onClose={() => setShowRequest(false)}
          onSubmit={handleCreateRequest}
          appointment={selectedAppointment}
          type={requestType}
        />
      </div>
    </DashboardLayout>
  );
}
