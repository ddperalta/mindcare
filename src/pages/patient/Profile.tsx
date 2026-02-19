import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { DashboardLayout } from '../../components/layout';
import { Card, Input, Button } from '../../components/common';

interface PatientProfile {
  dateOfBirth: any;
  phone?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export function PatientProfile() {
  const { currentUser, userProfile } = useAuth();
  const [, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    dateOfBirth: '',
    phone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
  });

  useEffect(() => {
    fetchProfile();
  }, [currentUser]);

  const fetchProfile = async () => {
    if (!currentUser) return;

    try {
      const patientDoc = await getDoc(doc(db, 'patients', currentUser.uid));
      if (patientDoc.exists()) {
        const data = patientDoc.data() as PatientProfile;
        setProfile(data);

        // Convert Firestore Timestamp to date string for input
        const dob = data.dateOfBirth?.toDate?.();
        const dateString = dob ? dob.toISOString().split('T')[0] : '';

        setFormData({
          dateOfBirth: dateString,
          phone: data.phone || '',
          emergencyContactName: data.emergencyContact?.name || '',
          emergencyContactPhone: data.emergencyContact?.phone || '',
          emergencyContactRelationship: data.emergencyContact?.relationship || '',
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Error al cargar el perfil');
    } finally {
      setLoading(false);
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
    setSuccess('');
    setSaving(true);

    try {
      if (!currentUser) throw new Error('No user logged in');

      const updateData: any = {
        phone: formData.phone || null,
      };

      // Add date of birth if provided
      if (formData.dateOfBirth) {
        updateData.dateOfBirth = new Date(formData.dateOfBirth);
      }

      // Add emergency contact if provided
      if (formData.emergencyContactName && formData.emergencyContactPhone) {
        updateData.emergencyContact = {
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone,
          relationship: formData.emergencyContactRelationship || 'No especificado',
        };
      } else {
        updateData.emergencyContact = null;
      }

      await updateDoc(doc(db, 'patients', currentUser.uid), updateData);

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
          Mi Perfil
        </h1>
        <p className="text-sm sm:text-base text-sage-600 mb-6 sm:mb-8">
          Actualiza tu información personal
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Account Info Card */}
          <Card elevated className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-sage-900 mb-4">
              Información de Cuenta
            </h3>

            <div className="space-y-4 min-w-0">
              <div className="min-w-0">
                <p className="text-sm text-sage-600">Nombre</p>
                <p className="font-semibold text-sage-900 break-words">{userProfile?.displayName}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-sage-600">Email</p>
                <p className="font-semibold text-sage-900 break-all">{userProfile?.email}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-sage-600">Tipo de Cuenta</p>
                <p className="font-semibold text-sage-900">Paciente</p>
              </div>
            </div>
          </Card>

          {/* Profile Form */}
          <Card elevated className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-sage-900 mb-6">
              Información Personal
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
                label="Fecha de Nacimiento"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
              />

              <Input
                label="Teléfono (opcional)"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+52 123 456 7890"
              />

              <div className="border-t border-sage-200 pt-6 mt-6">
                <h4 className="text-md font-semibold text-sage-800 mb-4">
                  Contacto de Emergencia (opcional)
                </h4>

                <div className="space-y-4">
                  <Input
                    label="Nombre"
                    name="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={handleChange}
                    placeholder="María González"
                  />

                  <Input
                    label="Teléfono"
                    name="emergencyContactPhone"
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={handleChange}
                    placeholder="+52 123 456 7890"
                  />

                  <Input
                    label="Parentesco"
                    name="emergencyContactRelationship"
                    value={formData.emergencyContactRelationship}
                    onChange={handleChange}
                    placeholder="Madre, Hermana, Cónyuge, etc."
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
