import { useState } from 'react';
import { Card, Button } from '../../components/common';
import { DashboardLayout } from '../../components/layout';
import { InvitationModal } from '../../components/therapist/InvitationModal';
import { PatientList } from '../../components/therapist/PatientList';

export function Patients() {
  const [showInvitation, setShowInvitation] = useState(false);

  const handleSuccess = (_invitationUrl: string) => {
    setShowInvitation(false);
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-sage-900">
              Mis Pacientes
            </h1>
            <p className="text-sage-600 mt-2">
              Gestiona tu lista de pacientes e invita nuevos pacientes
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowInvitation(true)}
          >
            Invitar Nuevo Paciente
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <h3 className="text-lg font-semibold text-sage-700 mb-2">
              Total de Pacientes
            </h3>
            <p className="text-4xl font-bold text-teal-600">0</p>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-sage-700 mb-2">
              Pacientes Activos
            </h3>
            <p className="text-4xl font-bold text-mint-600">0</p>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-sage-700 mb-2">
              Invitaciones Pendientes
            </h3>
            <p className="text-4xl font-bold text-coral-600">0</p>
          </Card>
        </div>

        <PatientList />

        <InvitationModal
          isOpen={showInvitation}
          onClose={() => setShowInvitation(false)}
          onSuccess={handleSuccess}
        />
      </div>
    </DashboardLayout>
  );
}
