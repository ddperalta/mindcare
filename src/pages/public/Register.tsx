import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { Button, Input, Card, LanguageSwitcher, SpecializationSelector } from '../../components/common';
import { ROUTES } from '../../config/constants';

interface InvitationData {
  valid: boolean;
  role: 'THERAPIST' | 'PATIENT';
  // For patient invitations (both types)
  therapistName?: string;
  patientEmail?: string;
  patientName?: string;
  // For user invitations (admin-created)
  invitedByName?: string;
  targetEmail?: string;
  targetName?: string;
  therapistData?: {
    cedula?: string;
    specialization?: string[];
    licenseNumber?: string;
  };
  expiresAt: string;
}

export function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [validating, setValidating] = useState(!!inviteToken);
  const [validationError, setValidationError] = useState('');

  const [formData, setFormData] = useState({
    displayName: '',
    password: '',
    confirmPassword: '',
    // Therapist-specific fields
    cedula: '',
    licenseNumber: '',
  });

  const [specialization, setSpecialization] = useState<string[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Validate invitation on mount if token present
  useEffect(() => {
    if (inviteToken) {
      validateInvitationToken();
    }
  }, [inviteToken]);

  const validateInvitationToken = async () => {
    setValidating(true);
    setValidationError('');

    try {
      const validateInvitation = httpsCallable(functions, 'validateInvitation');
      const result = await validateInvitation({ token: inviteToken });
      const data = result.data as InvitationData;

      setInvitationData(data);

      // Pre-fill form based on invitation type
      const initialName = data.role === 'PATIENT'
        ? (data.patientName || data.targetName || '')
        : (data.targetName || '');

      const initialTherapistData = data.therapistData || {};

      setFormData(prev => ({
        ...prev,
        displayName: initialName,
        cedula: initialTherapistData.cedula || '',
        licenseNumber: initialTherapistData.licenseNumber || '',
      }));

      setSpecialization(initialTherapistData.specialization || []);
    } catch (error: any) {
      console.error('Invalid invitation:', error);
      setValidationError(error.message || 'Invitación inválida o expirada');
    } finally {
      setValidating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!inviteToken) {
      setError('No se puede registrar sin una invitación');
      return;
    }

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.register.errors.passwordMismatch'));
      return;
    }

    if (formData.password.length < 6) {
      setError(t('auth.register.errors.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      if (invitationData?.role === 'THERAPIST') {
        // Therapist registration
        const createTherapist = httpsCallable(functions, 'createTherapistFromInvitation');
        await createTherapist({
          token: inviteToken,
          displayName: formData.displayName,
          password: formData.password,
          cedula: formData.cedula,
          specialization,
          licenseNumber: formData.licenseNumber || undefined,
        });

        // Redirect to therapist dashboard
        navigate(ROUTES.THERAPIST_DASHBOARD);
      } else {
        // Patient registration
        const createPatient = httpsCallable(functions, 'createPatientFromInvitation');
        await createPatient({
          token: inviteToken,
          displayName: formData.displayName,
          password: formData.password,
        });

        // Redirect to patient dashboard
        navigate(ROUTES.PATIENT_DASHBOARD);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || t('auth.register.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  // Loading state while validating invitation
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-mint-500 p-4">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <Card elevated className="w-full max-w-md text-center">
          <div className="flex flex-col items-center space-y-4">
            <svg
              className="animate-spin h-12 w-12 text-teal-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-sage-700 font-semibold">Validando invitación...</p>
          </div>
        </Card>
      </div>
    );
  }

  // No invitation token or validation failed
  if (!invitationData || validationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-mint-500 p-4">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <Card elevated className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-sage-900 mb-4">
            Registro Cerrado
          </h1>
          <p className="text-sage-700 mb-6">
            {validationError || 'El registro en MindCare requiere una invitación de un terapeuta.'}
          </p>
          <p className="text-sage-600 mb-6">
            Si eres un profesional de la salud mental interesado en usar la plataforma,
            por favor contacta al equipo de MindCare.
          </p>
          <Link to={ROUTES.LOGIN}>
            <Button variant="primary">
              Ir a Iniciar Sesión
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Valid invitation - show registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-mint-500 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <Card elevated className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-sage-900 mb-2">
            {invitationData.role === 'THERAPIST' ? 'Registro de Terapeuta' : 'Registro de Paciente'}
          </h1>
          <div className="bg-teal-50 border border-teal-200 px-4 py-3 rounded-xl">
            <p className="text-sage-700">
              Has sido invitado por{' '}
              <strong className="text-teal-700">
                {invitationData.therapistName || invitationData.invitedByName}
              </strong>
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-coral-50 border border-coral-200 text-coral-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label={t('auth.register.email')}
            value={invitationData.patientEmail || invitationData.targetEmail}
            disabled
            readOnly
            className="bg-sage-100"
          />

          <Input
            type="text"
            name="displayName"
            label={t('auth.register.fullName')}
            placeholder={t('auth.register.fullNamePlaceholder')}
            value={formData.displayName}
            onChange={handleChange}
            required
          />

          <Input
            type="password"
            name="password"
            label={t('auth.register.password')}
            placeholder={t('auth.register.passwordPlaceholder')}
            value={formData.password}
            onChange={handleChange}
            required
            helperText={invitationData.role === 'THERAPIST' ? 'Mínimo 8 caracteres' : t('auth.register.passwordHelper')}
          />

          <Input
            type="password"
            name="confirmPassword"
            label={t('auth.register.confirmPassword')}
            placeholder={t('auth.register.confirmPasswordPlaceholder')}
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          {/* Therapist-specific fields */}
          {invitationData.role === 'THERAPIST' && (
            <>
              <div className="border-t border-sage-200 pt-4">
                <h3 className="text-lg font-semibold text-sage-800 mb-4">
                  Información Profesional
                </h3>

                <Input
                  type="text"
                  name="cedula"
                  label="Cédula Profesional *"
                  placeholder="123456"
                  value={formData.cedula}
                  onChange={handleChange}
                  required
                  helperText="Número de cédula profesional"
                />
              </div>

              <SpecializationSelector
                value={specialization}
                onChange={setSpecialization}
                label="Especialización"
                required
                helperText="Selecciona una o más especializaciones"
              />

              <Input
                type="text"
                name="licenseNumber"
                label="Número de Licencia (opcional)"
                placeholder="LIC-123456"
                value={formData.licenseNumber}
                onChange={handleChange}
              />
            </>
          )}

          <Button type="submit" variant="primary" isLoading={loading} className="w-full">
            {t('auth.register.createAccount')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sage-600">
            {t('auth.register.haveAccount')}{' '}
            <Link
              to={ROUTES.LOGIN}
              className="text-teal-600 hover:text-teal-700 font-semibold"
            >
              {t('auth.register.signIn')}
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
