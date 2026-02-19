import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { Modal, Input, Button } from '../common';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTherapistForm({ isOpen, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    cedula: '',
    specialization: '',
    licenseNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Convert specialization string to array
      const specializationArray = formData.specialization
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      if (specializationArray.length === 0) {
        setError('Ingrese al menos una especialización');
        setLoading(false);
        return;
      }

      const createTherapist = httpsCallable(functions, 'createTherapistUser');
      await createTherapist({
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName,
        cedula: formData.cedula,
        specialization: specializationArray,
        licenseNumber: formData.licenseNumber || undefined,
      });

      // Reset form
      setFormData({
        email: '',
        password: '',
        displayName: '',
        cedula: '',
        specialization: '',
        licenseNumber: '',
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al crear terapeuta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Cuenta de Terapeuta"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-coral-50 border border-coral-200 text-coral-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <Input
          label="Nombre Completo"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          required
          placeholder="Dr. Juan Pérez"
        />

        <Input
          type="email"
          label="Correo Electrónico"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          placeholder="juan.perez@ejemplo.com"
        />

        <Input
          type="password"
          label="Contraseña Temporal"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          helperText="Mínimo 8 caracteres"
          minLength={8}
        />

        <Input
          label="Cédula Profesional"
          value={formData.cedula}
          onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
          required
          placeholder="12345678"
        />

        <Input
          label="Especialización(es)"
          value={formData.specialization}
          onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
          required
          placeholder="Psicología Clínica, Terapia Cognitivo-Conductual"
          helperText="Separe múltiples especializaciones con comas"
        />

        <Input
          label="Número de Licencia (opcional)"
          value={formData.licenseNumber}
          onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
          placeholder="LIC-2024-001"
        />

        <div className="flex gap-4 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Crear Terapeuta
          </Button>
        </div>
      </form>
    </Modal>
  );
}
