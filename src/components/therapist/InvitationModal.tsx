import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { Modal, Input, Button } from '../common';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invitationUrl: string) => void;
}

export function InvitationModal({ isOpen, onClose, onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const createInvitation = httpsCallable(functions, 'createPatientInvitation');
      const result = await createInvitation({
        patientEmail: email,
        patientName: name || undefined,
      });

      const data = result.data as any;
      setInvitationUrl(data.invitationUrl);
    } catch (err: any) {
      setError(err.message || 'Error al crear invitación');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(invitationUrl);
    // TODO: Show toast notification
    alert('Enlace copiado al portapapeles');
  };

  const handleClose = () => {
    setEmail('');
    setName('');
    setInvitationUrl('');
    setError('');
    onClose();
  };

  if (invitationUrl) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Enlace de Invitación Generado"
      >
        <div className="space-y-4">
          <p className="text-sage-700">
            Copia y envía este enlace a tu paciente:
          </p>

          <div className="bg-sage-100 p-4 rounded-xl break-all font-mono text-sm">
            {invitationUrl}
          </div>

          <div className="flex gap-4">
            <Button variant="secondary" onClick={handleCopy}>
              Copiar Enlace
            </Button>
            <Button variant="primary" onClick={() => {
              onSuccess(invitationUrl);
              handleClose();
            }}>
              Cerrar
            </Button>
          </div>

          <p className="text-sm text-sage-600">
            ⏰ Este enlace expirará en 7 días
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invitar Nuevo Paciente"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-coral-50 border border-coral-200 text-coral-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <Input
          type="email"
          label="Correo Electrónico del Paciente"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="paciente@ejemplo.com"
        />

        <Input
          label="Nombre del Paciente (opcional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="María González"
        />

        <div className="flex gap-4 pt-4">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Generar Enlace
          </Button>
        </div>
      </form>
    </Modal>
  );
}
