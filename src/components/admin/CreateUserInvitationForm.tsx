import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { functions, db } from '../../config/firebase';
import { Card, Input, Button, SpecializationSelector } from '../common';

interface CreateUserInvitationFormProps {
  onSuccess?: (invitationUrl: string) => void;
}

export function CreateUserInvitationForm({ onSuccess }: CreateUserInvitationFormProps) {
  const [role, setRole] = useState<'THERAPIST' | 'PATIENT'>('THERAPIST');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [selectedTherapistId, setSelectedTherapistId] = useState('');
  const [therapists, setTherapists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTherapists, setLoadingTherapists] = useState(false);
  const [error, setError] = useState('');
  const [invitationUrl, setInvitationUrl] = useState('');

  // Optional therapist pre-fill fields (for THERAPIST role)
  const [cedula, setCedula] = useState('');
  const [specialization, setSpecialization] = useState<string[]>([]);
  const [licenseNumber, setLicenseNumber] = useState('');

  // Fetch therapists when PATIENT role is selected
  useEffect(() => {
    if (role === 'PATIENT') {
      fetchTherapists();
    }
  }, [role]);

  const fetchTherapists = async () => {
    setLoadingTherapists(true);
    try {
      const therapistsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'THERAPIST')
      );
      const snapshot = await getDocs(therapistsQuery);
      const therapistsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTherapists(therapistsList);
    } catch (err) {
      console.error('Error fetching therapists:', err);
      setError('Error loading therapists list');
    } finally {
      setLoadingTherapists(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate based on role
      if (role === 'PATIENT' && !selectedTherapistId) {
        throw new Error('Please select a therapist for the patient');
      }

      const createInvitation = httpsCallable(functions, 'createUserInvitation');

      const requestData: any = {
        role,
        targetEmail: email,
        targetName: name || undefined,
      };

      // Add role-specific data
      if (role === 'PATIENT') {
        requestData.tenantId = `tenant_${selectedTherapistId}`;
      } else if (role === 'THERAPIST') {
        if (cedula || specialization.length > 0 || licenseNumber) {
          requestData.therapistData = {
            cedula: cedula || undefined,
            specialization: specialization.length > 0 ? specialization : undefined,
            licenseNumber: licenseNumber || undefined,
          };
        }
      }

      const result = await createInvitation(requestData);
      const data = result.data as any;

      setInvitationUrl(data.invitationUrl);

      if (onSuccess) {
        onSuccess(data.invitationUrl);
      }
    } catch (err: any) {
      console.error('Error creating invitation:', err);
      setError(err.message || 'Error creating invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(invitationUrl);
    // Could add a toast notification here
    alert('¡Enlace copiado al portapapeles!');
  };

  const handleReset = () => {
    setEmail('');
    setName('');
    setSelectedTherapistId('');
    setCedula('');
    setSpecialization([]);
    setLicenseNumber('');
    setInvitationUrl('');
    setError('');
  };

  // Success state - show invitation URL
  if (invitationUrl) {
    return (
      <Card elevated>
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold text-sage-900">
            ✅ Invitación Creada
          </h3>

          <p className="text-sage-700">
            Enlace de invitación para <strong>{role === 'THERAPIST' ? 'Terapeuta' : 'Paciente'}</strong>:
          </p>

          <div className="bg-sage-100 p-4 rounded-xl break-all font-mono text-sm">
            {invitationUrl}
          </div>

          <div className="flex gap-4">
            <Button variant="secondary" onClick={handleCopy}>
              📋 Copiar Enlace
            </Button>
            <Button variant="primary" onClick={handleReset}>
              Crear Otra Invitación
            </Button>
          </div>

          <p className="text-sm text-sage-600">
            ⏰ Este enlace expirará en 7 días
          </p>
        </div>
      </Card>
    );
  }

  // Form state
  return (
    <Card elevated>
      <h3 className="text-2xl font-semibold text-sage-900 mb-6">
        Crear Nueva Invitación
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-coral-50 border border-coral-200 text-coral-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Role Selector */}
        <div>
          <label className="label mb-2 block">Rol del Usuario</label>
          <div className="flex gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="THERAPIST"
                checked={role === 'THERAPIST'}
                onChange={(e) => setRole(e.target.value as 'THERAPIST' | 'PATIENT')}
                className="w-4 h-4 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sage-700">👨‍⚕️ Terapeuta</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="PATIENT"
                checked={role === 'PATIENT'}
                onChange={(e) => setRole(e.target.value as 'THERAPIST' | 'PATIENT')}
                className="w-4 h-4 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sage-700">🧑‍⚕️ Paciente</span>
            </label>
          </div>
        </div>

        {/* Email */}
        <Input
          type="email"
          label="Correo Electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="usuario@ejemplo.com"
        />

        {/* Name (optional) */}
        <Input
          label="Nombre Completo (opcional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del usuario"
        />

        {/* Conditional: Therapist Dropdown for PATIENT */}
        {role === 'PATIENT' && (
          <div>
            <label className="label mb-2 block">Asignar a Terapeuta *</label>
            {loadingTherapists ? (
              <p className="text-sage-600">Cargando terapeutas...</p>
            ) : (
              <select
                value={selectedTherapistId}
                onChange={(e) => setSelectedTherapistId(e.target.value)}
                className="input-field"
                required
              >
                <option value="">Seleccionar terapeuta...</option>
                {therapists.map((therapist) => (
                  <option key={therapist.id} value={therapist.id}>
                    {therapist.displayName} ({therapist.email})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Conditional: Optional Therapist Fields for THERAPIST */}
        {role === 'THERAPIST' && (
          <div className="space-y-4 border-t border-sage-200 pt-4">
            <h4 className="text-lg font-semibold text-sage-800">
              Información Adicional (Opcional)
            </h4>

            <Input
              label="Cédula Profesional"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="123456"
            />

            <SpecializationSelector
              value={specialization}
              onChange={setSpecialization}
              label="Especialización"
              helperText="Selecciona una o más especializaciones (opcional)"
            />

            <Input
              label="Número de Licencia"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="LIC-123456"
            />
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            disabled={loading || (role === 'PATIENT' && loadingTherapists)}
            className="flex-1"
          >
            {loading ? 'Generando...' : 'Generar Enlace de Invitación'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
