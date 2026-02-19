import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Card, Button } from '../common';

interface Invitation {
  id: string;
  role: 'THERAPIST' | 'PATIENT';
  targetEmail?: string;
  patientEmail?: string;
  targetName?: string;
  patientName?: string;
  invitedBy?: string;
  invitedByName?: string;
  therapistId?: string;
  therapistName?: string;
  status: 'PENDING' | 'USED' | 'EXPIRED' | 'CANCELLED';
  createdAt: any;
  expiresAt: any;
  type: 'user' | 'patient'; // Which collection it came from
}

export function InvitationsList() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<'ALL' | 'THERAPIST' | 'PATIENT'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'USED' | 'EXPIRED' | 'CANCELLED'>('ALL');

  useEffect(() => {
    // Subscribe to user_invitations (admin-created)
    const userInvitationsQuery = query(
      collection(db, 'user_invitations'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeUser = onSnapshot(userInvitationsQuery, (snapshot) => {
      const userInvites = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'user' as const,
      })) as Invitation[];

      // Subscribe to patient_invitations (therapist-created)
      const patientInvitationsQuery = query(
        collection(db, 'patient_invitations'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribePatient = onSnapshot(patientInvitationsQuery, (patientSnapshot) => {
        const patientInvites = patientSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          role: 'PATIENT' as const,
          type: 'patient' as const,
        })) as Invitation[];

        // Merge both lists
        const allInvites = [...userInvites, ...patientInvites].sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

        setInvitations(allInvites);
        setLoading(false);
      });

      return () => unsubscribePatient();
    });

    return () => unsubscribeUser();
  }, []);

  const handleCopyLink = (token: string) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/register?invite=${token}`;
    navigator.clipboard.writeText(url);
    alert('¡Enlace copiado al portapapeles!');
  };

  const handleCancel = async (invitation: Invitation) => {
    if (!confirm('¿Estás seguro de que deseas cancelar esta invitación?')) {
      return;
    }

    try {
      const collectionName = invitation.type === 'user' ? 'user_invitations' : 'patient_invitations';
      const invitationRef = doc(db, collectionName, invitation.id);
      await updateDoc(invitationRef, {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      });
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      alert('Error al cancelar la invitación');
    }
  };

  const filteredInvitations = invitations.filter(inv => {
    if (filterRole !== 'ALL' && inv.role !== filterRole) return false;
    if (filterStatus !== 'ALL' && inv.status !== filterStatus) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      USED: 'bg-green-100 text-green-800 border-green-200',
      EXPIRED: 'bg-gray-100 text-gray-800 border-gray-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getRoleBadge = (role: string) => {
    return role === 'THERAPIST'
      ? 'bg-teal-100 text-teal-800 border-teal-200'
      : 'bg-mint-100 text-mint-800 border-mint-200';
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card>
        <p className="text-sage-600">Cargando invitaciones...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="label mb-2 block text-sm">Filtrar por Rol</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
              className="input-field text-sm"
            >
              <option value="ALL">Todos</option>
              <option value="THERAPIST">Terapeuta</option>
              <option value="PATIENT">Paciente</option>
            </select>
          </div>

          <div>
            <label className="label mb-2 block text-sm">Filtrar por Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="input-field text-sm"
            >
              <option value="ALL">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="USED">Usado</option>
              <option value="EXPIRED">Expirado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>

          <div className="flex items-end">
            <p className="text-sm text-sage-600">
              Mostrando {filteredInvitations.length} de {invitations.length} invitaciones
            </p>
          </div>
        </div>
      </Card>

      {/* Invitations List */}
      <div className="space-y-3">
        {filteredInvitations.length === 0 ? (
          <Card>
            <p className="text-sage-600 text-center py-8">
              No se encontraron invitaciones con los filtros seleccionados
            </p>
          </Card>
        ) : (
          filteredInvitations.map((invitation) => (
            <Card key={invitation.id} elevated>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-1 rounded-lg border ${getRoleBadge(invitation.role)}`}>
                      {invitation.role === 'THERAPIST' ? '👨‍⚕️ Terapeuta' : '🧑‍⚕️ Paciente'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-lg border ${getStatusBadge(invitation.status)}`}>
                      {invitation.status}
                    </span>
                    <span className="text-xs text-sage-500">
                      {invitation.type === 'user' ? '(Admin)' : '(Terapeuta)'}
                    </span>
                  </div>

                  <p className="text-lg font-semibold text-sage-900">
                    {invitation.targetEmail || invitation.patientEmail}
                  </p>

                  {(invitation.targetName || invitation.patientName) && (
                    <p className="text-sm text-sage-600">
                      {invitation.targetName || invitation.patientName}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-sage-600">
                    <div>
                      <span className="font-medium">Creada:</span> {formatDate(invitation.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Expira:</span> {formatDate(invitation.expiresAt)}
                    </div>
                    {invitation.invitedByName && (
                      <div>
                        <span className="font-medium">Por:</span> {invitation.invitedByName}
                      </div>
                    )}
                    {invitation.therapistName && (
                      <div>
                        <span className="font-medium">Terapeuta:</span> {invitation.therapistName}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  {invitation.status === 'PENDING' && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => handleCopyLink(invitation.id)}
                        className="text-sm"
                      >
                        📋 Copiar
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleCancel(invitation)}
                        className="text-sm text-coral-600 hover:bg-coral-50"
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
