import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { DashboardLayout } from '../../components/layout';
import { Card, Button, Input } from '../../components/common';
import { ROUTES } from '../../config/constants';
import type { TestDefinition } from '../../types/test.types';

interface Patient {
  uid: string;
  displayName: string;
  email: string;
}

export function TestAssign() {
  const { testId } = useParams<{ testId: string }>();
  const { currentUser, customClaims } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState<TestDefinition | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (testId && currentUser && customClaims?.tenantId) {
      fetchTest();
      fetchPatients();
    }
  }, [testId, currentUser, customClaims]);

  const fetchTest = async () => {
    if (!testId) return;

    try {
      const testDoc = await getDoc(doc(db, 'test_definitions', testId));
      if (testDoc.exists()) {
        setTest({ id: testDoc.id, ...testDoc.data() } as TestDefinition);
      }
    } catch (err) {
      console.error('Error fetching test:', err);
      setError('Error al cargar el test');
    }
  };

  const fetchPatients = async () => {
    if (!currentUser) return;

    try {
      const relationshipsQuery = query(
        collection(db, 'therapist_patients'),
        where('therapistId', '==', currentUser.uid),
        where('status', '==', 'ACTIVE')
      );

      const snapshot = await getDocs(relationshipsQuery);
      const patientPromises = snapshot.docs.map(async (relationshipDoc) => {
        const patientId = relationshipDoc.data().patientId;
        const userDoc = await getDoc(doc(db, 'users', patientId));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          return {
            uid: patientId,
            displayName: userData.displayName || 'Sin nombre',
            email: userData.email,
          };
        }
        return null;
      });

      const patientsData = await Promise.all(patientPromises);
      setPatients(patientsData.filter((p): p is Patient => p !== null));
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedPatient) {
      setError('Debes seleccionar un paciente');
      return;
    }

    if (!test || !currentUser || !customClaims?.tenantId) return;

    setAssigning(true);
    setError('');

    try {
      await addDoc(collection(db, 'test_assignments'), {
        testId: test.id,
        testTitle: test.title,
        therapistId: currentUser.uid,
        patientId: selectedPatient,
        tenantId: customClaims.tenantId,
        assignedAt: Timestamp.now(),
        dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
        status: 'PENDING',
        responses: [],
      });

      setSuccess(true);
      setTimeout(() => {
        navigate(ROUTES.THERAPIST_TESTS);
      }, 2000);
    } catch (err: any) {
      console.error('Error assigning test:', err);
      setError(err.message || 'Error al asignar el test');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-4xl mx-auto">
          <p className="text-sage-600">Cargando...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!test) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-4xl mx-auto">
          <Card>
            <p className="text-coral-600">Test no encontrado</p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (success) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-4xl mx-auto">
          <Card elevated>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-sage-900 mb-2">
                Test Asignado Exitosamente
              </h2>
              <p className="text-sage-600 mb-6">
                El paciente recibirá una notificación y podrá completar el test
              </p>
              <Button
                variant="primary"
                onClick={() => navigate(ROUTES.THERAPIST_TESTS)}
              >
                Volver a Mis Tests
              </Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-sage-900 mb-2">
          Asignar Test a Paciente
        </h1>
        <p className="text-sage-600 mb-8">
          Selecciona un paciente y opcionalmente establece una fecha límite
        </p>

        <div className="space-y-6">
          {/* Test Info */}
          <Card elevated>
            <h3 className="text-lg font-semibold text-sage-900 mb-2">
              Test: {test.title}
            </h3>
            <p className="text-sage-600 text-sm mb-4">
              {test.description}
            </p>
            <div className="flex items-center gap-2 text-sm text-sage-600">
              <span className="font-medium">📝</span>
              {test.questions.length} pregunta{test.questions.length !== 1 ? 's' : ''}
            </div>
          </Card>

          {/* Assignment Form */}
          <Card elevated>
            <h3 className="text-lg font-semibold text-sage-900 mb-6">
              Detalles de Asignación
            </h3>

            {error && (
              <div className="bg-coral-50 border border-coral-200 text-coral-700 px-4 py-3 rounded-xl mb-6">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Patient Selector */}
              <div>
                <label className="label mb-2 block">Seleccionar Paciente *</label>
                {patients.length === 0 ? (
                  <p className="text-sage-600 text-sm">
                    No tienes pacientes activos. Invita a un paciente primero.
                  </p>
                ) : (
                  <select
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Seleccionar paciente...</option>
                    {patients.map((patient) => (
                      <option key={patient.uid} value={patient.uid}>
                        {patient.displayName} ({patient.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Due Date */}
              <Input
                type="date"
                label="Fecha Límite (opcional)"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                helperText="El paciente podrá ver esta fecha como referencia"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-6 pt-6 border-t border-sage-200">
              <Button
                variant="ghost"
                onClick={() => navigate(ROUTES.THERAPIST_TESTS)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleAssign}
                isLoading={assigning}
                disabled={assigning || !selectedPatient || patients.length === 0}
                className="flex-1"
              >
                {assigning ? 'Asignando...' : 'Asignar Test'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
