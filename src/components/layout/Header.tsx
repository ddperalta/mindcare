import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../common';
import { ROUTES } from '../../config/constants';
import { usePendingRequestCount } from '../../hooks/usePendingRequestCount';

export function Header() {
  const { userProfile, customClaims, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pendingRequestCount = usePendingRequestCount();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate(ROUTES.LOGIN);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getRoleName = () => {
    switch (customClaims?.role) {
      case 'ADMIN': return 'Administrador';
      case 'THERAPIST': return 'Terapeuta';
      case 'PATIENT': return 'Paciente';
      default: return '';
    }
  };

  const getDashboardLink = () => {
    switch (customClaims?.role) {
      case 'ADMIN': return ROUTES.ADMIN_DASHBOARD;
      case 'THERAPIST': return ROUTES.THERAPIST_DASHBOARD;
      case 'PATIENT': return ROUTES.PATIENT_DASHBOARD;
      default: return ROUTES.LANDING;
    }
  };

  const getProfileLink = () => {
    switch (customClaims?.role) {
      case 'THERAPIST': return ROUTES.THERAPIST_PROFILE;
      case 'PATIENT': return ROUTES.PATIENT_PROFILE;
      default: return null;
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const tabClass = (path: string) =>
    `px-5 py-2.5 text-sm font-semibold transition-all whitespace-nowrap relative ${
      isActive(path)
        ? 'text-teal-600 border-b-2 border-teal-600'
        : 'text-sage-600 hover:text-sage-900'
    }`;

  const therapistTabs = [
    { label: '👥 Pacientes', path: ROUTES.THERAPIST_PATIENTS },
    { label: '📅 Citas', path: ROUTES.THERAPIST_APPOINTMENTS },
    { label: '📝 Tests', path: ROUTES.THERAPIST_TESTS },
    { label: '👤 Perfil', path: ROUTES.THERAPIST_PROFILE },
  ];

  const patientTabs = [
    { label: '📅 Mis Citas', path: ROUTES.PATIENT_APPOINTMENTS },
    { label: '📋 Mis Evaluaciones', path: ROUTES.PATIENT_TESTS },
    { label: '👤 Perfil', path: ROUTES.PATIENT_PROFILE },
  ];

  const roleTabs =
    customClaims?.role === 'THERAPIST'
      ? therapistTabs
      : customClaims?.role === 'PATIENT'
      ? patientTabs
      : null;

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-sage-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex items-center justify-between py-3 sm:py-4">
          {/* Logo */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => navigate(getDashboardLink())}
              className="text-xl sm:text-2xl font-bold text-teal-600 hover:text-teal-700 transition-colors"
            >
              MindCare
            </button>
            <div className="hidden sm:block">
              <span className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-teal-100 text-teal-800 rounded-full font-medium">
                {getRoleName()}
              </span>
            </div>
          </div>

          {/* Desktop: user info + Home + Sign Out only */}
          <div className="hidden md:flex items-center space-x-2">
            <div className="text-right mr-2">
              <p className="text-sm font-semibold text-sage-900 truncate max-w-[150px]">
                {userProfile?.displayName}
              </p>
              <p className="text-xs text-sage-600 truncate max-w-[150px]">
                {userProfile?.email}
              </p>
            </div>

            <Button
              variant="ghost"
              onClick={() => navigate(getDashboardLink())}
              className="text-teal-600 hover:bg-teal-50"
            >
              🏠 Inicio
            </Button>

            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="text-coral-600 hover:bg-coral-50"
            >
              🚪 Cerrar Sesión
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-sage-600 hover:bg-sage-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Tab row — only for THERAPIST and PATIENT, desktop */}
        {roleTabs && (
          <div className="hidden md:flex gap-1 border-t border-sage-100 overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            {roleTabs.map((tab) => (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={tabClass(tab.path)}
              >
                {tab.label}
                {tab.path === ROUTES.THERAPIST_APPOINTMENTS && pendingRequestCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center bg-coral-500 text-white text-xs rounded-full w-4 h-4 font-bold">
                    {pendingRequestCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 pt-3 border-t border-sage-200 space-y-1 pb-3">
            <div className="px-3 py-2 bg-sage-50 rounded-lg mb-3">
              <p className="text-sm font-semibold text-sage-900">{userProfile?.displayName}</p>
              <p className="text-xs text-sage-600">{userProfile?.email}</p>
              <span className="inline-block mt-2 text-xs px-2 py-1 bg-teal-100 text-teal-800 rounded-full font-medium">
                {getRoleName()}
              </span>
            </div>

            <button
              onClick={() => handleNavigation(getDashboardLink())}
              className="w-full text-left px-4 py-3 rounded-lg text-sage-700 hover:bg-sage-50 transition-colors font-medium"
            >
              🏠 Inicio
            </button>

            {roleTabs?.map((tab) => (
              <button
                key={tab.path}
                onClick={() => handleNavigation(tab.path)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-medium ${
                  isActive(tab.path)
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-sage-700 hover:bg-sage-50'
                }`}
              >
                {tab.label}
                {tab.path === ROUTES.THERAPIST_APPOINTMENTS && pendingRequestCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center bg-coral-500 text-white text-xs rounded-full w-5 h-5 font-bold">
                    {pendingRequestCount}
                  </span>
                )}
              </button>
            ))}

            {getProfileLink() && !roleTabs?.some(t => t.path === getProfileLink()) && (
              <button
                onClick={() => handleNavigation(getProfileLink()!)}
                className="w-full text-left px-4 py-3 rounded-lg text-sage-700 hover:bg-sage-50 transition-colors font-medium"
              >
                👤 Mi Perfil
              </button>
            )}

            <button
              onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
              className="w-full text-left px-4 py-3 rounded-lg text-coral-600 hover:bg-coral-50 transition-colors font-medium"
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
