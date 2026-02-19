import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { Card } from '../../components/common';
import { DashboardLayout } from '../../components/layout';
import { CreateUserInvitationForm } from '../../components/admin/CreateUserInvitationForm';
import { InvitationsList } from '../../components/admin/InvitationsList';
import { UserManagementList } from '../../components/admin/UserManagementList';
import { TestManagementList } from '../../components/admin/TestManagementList';
import { AppointmentManagement } from '../../components/admin/AppointmentManagement';
import { ROUTES } from '../../config/constants';

type TabType = 'overview' | 'invitations' | 'users' | 'tests' | 'appointments';

export function AdminDashboard() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalTherapists: 0,
    verifiedTherapists: 0,
    totalPatients: 0,
    activeInvitations: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Initialize tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && ['overview', 'invitations', 'users', 'tests', 'appointments'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Fetch stats
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      // Count therapists
      const therapistsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'THERAPIST')
      );
      const therapistsSnapshot = await getDocs(therapistsQuery);
      const totalTherapists = therapistsSnapshot.size;

      // Count verified therapists
      const therapistsCollectionSnapshot = await getDocs(collection(db, 'therapists'));
      const verifiedTherapists = therapistsCollectionSnapshot.docs.filter(
        therapistDoc => therapistDoc.data().isVerified
      ).length;

      // Count patients
      const patientsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'PATIENT')
      );
      const patientsSnapshot = await getDocs(patientsQuery);
      const totalPatients = patientsSnapshot.size;

      // Count active invitations
      const userInvitationsQuery = query(
        collection(db, 'user_invitations'),
        where('status', '==', 'PENDING')
      );
      const patientInvitationsQuery = query(
        collection(db, 'patient_invitations'),
        where('status', '==', 'PENDING')
      );

      const [userInvitesSnapshot, patientInvitesSnapshot] = await Promise.all([
        getDocs(userInvitationsQuery),
        getDocs(patientInvitationsQuery),
      ]);

      const activeInvitations = userInvitesSnapshot.size + patientInvitesSnapshot.size;

      setStats({
        totalTherapists,
        verifiedTherapists,
        totalPatients,
        activeInvitations,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-sage-900 mb-2">
          Panel de Administración
        </h1>
        <p className="text-sage-600 mb-8">
          Bienvenido, {userProfile?.displayName}
        </p>

        {/* Tabs Navigation */}
        <div className="flex gap-2 mb-8 border-b border-sage-200 overflow-x-auto">
          <button
            onClick={() => handleTabChange('overview')}
            className={`px-6 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-sage-600 hover:text-sage-900'
            }`}
          >
            📊 Resumen
          </button>
          <button
            onClick={() => handleTabChange('invitations')}
            className={`px-6 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'invitations'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-sage-600 hover:text-sage-900'
            }`}
          >
            📋 Invitaciones
          </button>
          <button
            onClick={() => handleTabChange('users')}
            className={`px-6 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-sage-600 hover:text-sage-900'
            }`}
          >
            👥 Usuarios
          </button>
          <button
            onClick={() => handleTabChange('tests')}
            className={`px-6 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'tests'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-sage-600 hover:text-sage-900'
            }`}
          >
            📊 Tests
          </button>
          <button
            onClick={() => handleTabChange('appointments')}
            className={`px-6 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'appointments'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-sage-600 hover:text-sage-900'
            }`}
          >
            📅 Citas
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <h3 className="text-lg font-semibold text-sage-700 mb-2">
                  Total de Terapeutas
                </h3>
                <p className="text-4xl font-bold text-teal-600">
                  {loadingStats ? '...' : stats.totalTherapists}
                </p>
                <p className="text-sm text-sage-500 mt-2">
                  Verificados: {loadingStats ? '...' : stats.verifiedTherapists}
                </p>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-sage-700 mb-2">
                  Total de Pacientes
                </h3>
                <p className="text-4xl font-bold text-mint-600">
                  {loadingStats ? '...' : stats.totalPatients}
                </p>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-sage-700 mb-2">
                  Invitaciones Activas
                </h3>
                <p className="text-4xl font-bold text-coral-600">
                  {loadingStats ? '...' : stats.activeInvitations}
                </p>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-sage-700 mb-2">
                  Usuarios Totales
                </h3>
                <p className="text-4xl font-bold text-sage-600">
                  {loadingStats ? '...' : stats.totalTherapists + stats.totalPatients}
                </p>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card elevated>
                <h2 className="text-2xl font-semibold text-sage-900 mb-4">
                  Acciones Rápidas
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={() => handleTabChange('invitations')}
                    className="btn-primary w-full"
                  >
                    📋 Gestionar Invitaciones
                  </button>
                  <button
                    onClick={() => handleTabChange('users')}
                    className="btn-secondary w-full"
                  >
                    👥 Gestionar Usuarios
                  </button>
                  <button
                    onClick={() => handleTabChange('tests')}
                    className="btn-secondary w-full"
                  >
                    📊 Ver Asignaciones de Tests
                  </button>
                  <button
                    onClick={() => navigate(ROUTES.ADMIN_TEST_TEMPLATES)}
                    className="btn-secondary w-full"
                  >
                    📝 Gestionar Plantillas de Tests
                  </button>
                  <button
                    onClick={() => handleTabChange('appointments')}
                    className="btn-secondary w-full"
                  >
                    📅 Ver Citas
                  </button>
                </div>
              </Card>

              <Card elevated>
                <h2 className="text-2xl font-semibold text-sage-900 mb-4">
                  Actividad Reciente
                </h2>
                <p className="text-sage-600">
                  {stats.activeInvitations > 0
                    ? `${stats.activeInvitations} invitaciones pendientes`
                    : 'No hay invitaciones pendientes'}
                </p>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'invitations' && (
          <div className="space-y-6">
            <div className="border border-sage-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-sage-50 transition-colors"
              >
                <span className="text-lg font-semibold text-sage-900">➕ Crear Nueva Invitación</span>
                <svg
                  className={`w-5 h-5 text-sage-500 transition-transform ${showCreateForm ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showCreateForm && (
                <div className="px-6 pb-6 border-t border-sage-200">
                  <CreateUserInvitationForm
                    onSuccess={() => {
                      fetchStats();
                      setShowCreateForm(false);
                    }}
                  />
                </div>
              )}
            </div>
            <InvitationsList />
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <UserManagementList />
          </div>
        )}

        {activeTab === 'tests' && (
          <div>
            <TestManagementList />
          </div>
        )}

        {activeTab === 'appointments' && (
          <div>
            <AppointmentManagement />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
