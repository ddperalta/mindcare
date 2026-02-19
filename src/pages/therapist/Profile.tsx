import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { DashboardLayout } from '../../components/layout';
import { Card, Input, Button, SpecializationSelector, BankSelector } from '../../components/common';

interface TherapistProfile {
  cedula: string;
  specialization: string[];
  licenseNumber: string;
  tenantId: string;
  isVerified: boolean;
  bio?: string;
  phone?: string;
  bankInfo?: {
    bankName: string;
    clabe: string;
    accountHolder: string;
  };
}

export function TherapistProfile() {
  const { currentUser, userProfile } = useAuth();
  const [profile, setProfile] = useState<TherapistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    cedula: '',
    licenseNumber: '',
    bio: '',
    phone: '',
    bankName: '',
    clabe: '',
    accountHolder: '',
  });
  const [specialization, setSpecialization] = useState<string[]>([]);

  useEffect(() => {
    fetchProfile();
  }, [currentUser]);

  const fetchProfile = async () => {
    if (!currentUser) return;

    try {
      const therapistDoc = await getDoc(doc(db, 'therapists', currentUser.uid));
      if (therapistDoc.exists()) {
        const data = therapistDoc.data() as TherapistProfile;
        setProfile(data);
        setFormData({
          cedula: data.cedula || '',
          licenseNumber: data.licenseNumber || '',
          bio: data.bio || '',
          phone: data.phone || '',
          bankName: data.bankInfo?.bankName || '',
          clabe: data.bankInfo?.clabe || '',
          accountHolder: data.bankInfo?.accountHolder || '',
        });
        setSpecialization(data.specialization || []);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (!currentUser) throw new Error('No user logged in');

      await updateDoc(doc(db, 'therapists', currentUser.uid), {
        cedula: formData.cedula,
        specialization,
        licenseNumber: formData.licenseNumber,
        bio: formData.bio,
        phone: formData.phone,
        bankInfo: formData.bankName ? {
          bankName: formData.bankName,
          clabe: formData.clabe,
          accountHolder: formData.accountHolder,
        } : null,
      });

      setSuccess('Perfil actualizado correctamente');
      await fetchProfile();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-4xl mx-auto">
          <p className="text-sage-600">Cargando perfil...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-sage-900 mb-2">
          Mi Perfil Profesional
        </h1>
        <p className="text-sm sm:text-base text-sage-600 mb-6 sm:mb-8">
          Actualiza tu información profesional
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Verification Status Card */}
          <Card elevated className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-sage-900 mb-4">
              Estado de Verificación
            </h3>
            {profile?.isVerified ? (
              <div className="flex items-center space-x-2 text-green-700">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-semibold">Verificado</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-yellow-700">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-semibold">Pendiente de Verificación</span>
              </div>
            )}

            <div className="mt-6 space-y-2 min-w-0">
              <div className="min-w-0">
                <p className="text-sm text-sage-600">Nombre</p>
                <p className="font-semibold text-sage-900 break-words">{userProfile?.displayName}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-sage-600">Email</p>
                <p className="font-semibold text-sage-900 break-all">{userProfile?.email}</p>
              </div>
              <div>
                <p className="text-sm text-sage-600">Tenant ID</p>
                <p className="text-xs font-mono text-sage-700 break-all">{profile?.tenantId}</p>
              </div>
            </div>
          </Card>

          {/* Profile Form */}
          <Card elevated className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-sage-900 mb-6">
              Información Profesional
            </h3>

            {error && (
              <div className="bg-coral-50 border border-coral-200 text-coral-700 px-4 py-3 rounded-xl mb-6">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Cédula Profesional"
                name="cedula"
                value={formData.cedula}
                onChange={handleChange}
                required
                placeholder="123456"
              />

              <SpecializationSelector
                value={specialization}
                onChange={setSpecialization}
                label="Especialización"
                required
                helperText="Selecciona una o más especializaciones"
              />

              <Input
                label="Número de Licencia (opcional)"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                placeholder="LIC-123456"
              />

              <Input
                label="Teléfono (opcional)"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+52 123 456 7890"
              />

              <div>
                <label className="label mb-2 block">Biografía (opcional)</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  className="input-field resize-none"
                  placeholder="Cuéntanos sobre tu experiencia y enfoque terapéutico..."
                />
              </div>

              {/* Bank Info Section */}
              <div className="pt-4 border-t border-sage-200">
                <h4 className="text-md font-semibold text-sage-900 mb-4">
                  Datos Bancarios (para citas virtuales)
                </h4>
                <div className="space-y-4">
                  <BankSelector
                    value={formData.bankName}
                    onChange={(bankName: string) => setFormData({ ...formData, bankName })}
                    label="Nombre del Banco"
                    required
                    placeholder="Selecciona un banco"
                  />
                  <Input
                    label="CLABE Interbancaria (18 dígitos)"
                    name="clabe"
                    value={formData.clabe}
                    onChange={handleChange}
                    placeholder="012345678901234567"
                    maxLength={18}
                  />
                  <Input
                    label="Titular de la Cuenta"
                    name="accountHolder"
                    value={formData.accountHolder}
                    onChange={handleChange}
                    placeholder="Nombre completo del titular"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  className="flex-1"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
