import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { DashboardLayout } from '../../components/layout';
import { Card, Button } from '../../components/common';
import type { TestAssignment, TestDefinition } from '../../types/test.types';

interface PatientInfo {
  displayName: string;
  email: string;
}

export function TestResults() {
  const { testId } = useParams<{ testId: string }>();
  const { currentUser } = useAuth();
  const [test, setTest] = useState<TestDefinition | null>(null);
  const [assignments, setAssignments] = useState<TestAssignment[]>([]);
  const [patients, setPatients] = useState<Record<string, PatientInfo>>({});
  const [selectedAssignment, setSelectedAssignment] = useState<TestAssignment | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (testId && currentUser) {
      fetchTestAndResults();
    }
  }, [testId, currentUser]);

  const fetchTestAndResults = async () => {
    if (!testId || !currentUser) return;

    try {
      // Fetch test definition
      const testDoc = await getDoc(doc(db, 'test_definitions', testId));
      if (testDoc.exists()) {
        setTest({ id: testDoc.id, ...testDoc.data() } as TestDefinition);
      }

      // Fetch all assignments for this test
      const assignmentsQuery = query(
        collection(db, 'test_assignments'),
        where('testId', '==', testId),
        where('therapistId', '==', currentUser.uid)
      );

      const snapshot = await getDocs(assignmentsQuery);
      const assignmentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as TestAssignment[];

      setAssignments(assignmentsData);

      // Fetch patient info for each assignment
      const patientIds = [...new Set(assignmentsData.map(a => a.patientId))];
      const patientsInfo: Record<string, PatientInfo> = {};

      await Promise.all(
        patientIds.map(async (patientId) => {
          const userDoc = await getDoc(doc(db, 'users', patientId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            patientsInfo[patientId] = {
              displayName: userData.displayName || 'Sin nombre',
              email: userData.email,
            };
          }
        })
      );

      setPatients(patientsInfo);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto">
          <p className="text-sage-600">Cargando resultados...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!test) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto">
          <Card>
            <p className="text-coral-600">Test no encontrado</p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const handleArchive = async (assignmentId: string) => {
    try {
      await updateDoc(doc(db, 'test_assignments', assignmentId), {
        isArchived: true,
        archivedAt: Timestamp.now(),
      });
      setAssignments(prev =>
        prev.map(a => a.id === assignmentId ? { ...a, isArchived: true, archivedAt: Timestamp.now() } : a)
      );
    } catch (error) {
      console.error('Error archiving assignment:', error);
    }
  };

  const handleUnarchive = async (assignmentId: string) => {
    try {
      await updateDoc(doc(db, 'test_assignments', assignmentId), {
        isArchived: false,
        archivedAt: null,
      });
      setAssignments(prev =>
        prev.map(a => a.id === assignmentId ? { ...a, isArchived: false, archivedAt: undefined } : a)
      );
    } catch (error) {
      console.error('Error unarchiving assignment:', error);
    }
  };

  const allCompleted = assignments.filter(a => a.status === 'COMPLETED');
  const activeCompleted = allCompleted.filter(a => !a.isArchived);
  const archivedCompleted = allCompleted.filter(a => a.isArchived);
  const completedAssignments = showArchived ? allCompleted : activeCompleted;
  const pendingAssignments = assignments.filter(a => a.status !== 'COMPLETED');

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-sage-900 mb-2">
            Resultados: {test.title}
          </h1>
          <p className="text-sage-600">
            {activeCompleted.length} completado{activeCompleted.length !== 1 ? 's' : ''} • {' '}
            {pendingAssignments.length} pendiente{pendingAssignments.length !== 1 ? 's' : ''}
            {archivedCompleted.length > 0 && ` • ${archivedCompleted.length} archivado${archivedCompleted.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {selectedAssignment ? (
          /* Detailed View */
          <div className="space-y-6">
            <Card elevated>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-sage-900">
                    Paciente: {patients[selectedAssignment.patientId]?.displayName}
                  </h3>
                  <p className="text-sm text-sage-600">
                    {patients[selectedAssignment.patientId]?.email}
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setSelectedAssignment(null)}>
                  ← Volver a la lista
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-sage-50 rounded-xl">
                <div>
                  <p className="text-sm text-sage-600">Asignado</p>
                  <p className="font-semibold text-sage-900">
                    {formatDate(selectedAssignment.assignedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-sage-600">Completado</p>
                  <p className="font-semibold text-sage-900">
                    {formatDate(selectedAssignment.completedAt)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Responses */}
            <Card elevated>
              <h3 className="text-xl font-semibold text-sage-900 mb-6">
                Respuestas
              </h3>

              <div className="space-y-6">
                {selectedAssignment.responses.map((response, index) => (
                  <div key={response.questionId} className="pb-6 border-b border-sage-200 last:border-0">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-sm font-semibold text-sage-600">
                        {index + 1}.
                      </span>
                      <p className="flex-1 font-medium text-sage-900">
                        {response.questionText}
                      </p>
                    </div>
                    <div className="ml-6">
                      <ResponseDisplay response={response} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          /* List View */
          <div className="space-y-6">
            {completedAssignments.length === 0 ? (
              <Card elevated>
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold text-sage-900 mb-2">
                    No hay resultados disponibles
                  </h3>
                  <p className="text-sage-600">
                    Los pacientes aún no han completado este test
                  </p>
                </div>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-sage-900">
                    Evaluaciones Completadas ({activeCompleted.length})
                  </h2>
                  {archivedCompleted.length > 0 && (
                    <button
                      onClick={() => setShowArchived(!showArchived)}
                      className="text-sm text-teal-600 hover:text-teal-800 font-medium"
                    >
                      {showArchived
                        ? 'Ocultar archivados'
                        : `Mostrar archivados (${archivedCompleted.length})`}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedAssignments.map((assignment) => (
                    <Card key={assignment.id} elevated>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-sage-900">
                          {patients[assignment.patientId]?.displayName}
                        </h3>
                        {assignment.isArchived && (
                          <span className="text-xs px-2 py-0.5 bg-sage-100 text-sage-600 rounded-full">
                            Archivado
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-sage-600 mb-4">
                        {patients[assignment.patientId]?.email}
                      </p>

                      <div className="space-y-2 text-sm text-sage-600 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">✓</span>
                          Completado: {formatDate(assignment.completedAt)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">📝</span>
                          {assignment.responses.length} respuesta{assignment.responses.length !== 1 ? 's' : ''}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          onClick={() => setSelectedAssignment(assignment)}
                          className="flex-1"
                        >
                          Ver Respuestas
                        </Button>
                        {assignment.isArchived ? (
                          <Button
                            variant="ghost"
                            onClick={() => handleUnarchive(assignment.id)}
                            className="text-sm"
                          >
                            Desarchivar
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            onClick={() => handleArchive(assignment.id)}
                            className="text-sm"
                          >
                            Archivar
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {/* Pending Assignments */}
            {pendingAssignments.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl font-semibold text-sage-900 mb-4">
                  Pendientes ({pendingAssignments.length})
                </h2>
                <div className="space-y-2">
                  {pendingAssignments.map((assignment) => (
                    <Card key={assignment.id}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sage-900">
                            {patients[assignment.patientId]?.displayName}
                          </p>
                          <p className="text-sm text-sage-600">
                            Asignado: {formatDate(assignment.assignedAt)}
                          </p>
                        </div>
                        <span className="text-xs px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg">
                          {assignment.status === 'IN_PROGRESS' ? 'En Progreso' : 'Pendiente'}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Response Display Component
function ResponseDisplay({ response }: { response: any }) {
  switch (response.questionType) {
    case 'TEXT':
      return (
        <div className="p-4 bg-sage-50 rounded-xl">
          <p className="text-sage-900 whitespace-pre-wrap">{response.answer || 'Sin respuesta'}</p>
        </div>
      );

    case 'MULTIPLE_CHOICE':
      return (
        <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
          <p className="text-teal-900 font-semibold">{response.answerText || response.answer}</p>
        </div>
      );

    case 'SCALE':
      return (
        <div className="p-4 bg-sage-50 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-teal-600">{response.answer}</div>
            <div className="flex-1 h-2 bg-sage-200 rounded-full">
              <div
                className="h-full bg-teal-600 rounded-full"
                style={{ width: `${(response.answer / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>
      );

    case 'YES_NO':
      return (
        <div className="p-4 bg-sage-50 rounded-xl">
          <p className="text-sage-900 font-semibold">
            {response.answer === true ? '✓ Sí' : response.answer === false ? '✗ No' : 'Sin respuesta'}
          </p>
        </div>
      );

    default:
      return (
        <p className="text-sage-600">{String(response.answer)}</p>
      );
  }
}
