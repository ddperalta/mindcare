import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, orderBy, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { DashboardLayout } from '../../components/layout';
import { Card, Button } from '../../components/common';
import { ROUTES } from '../../config/constants';
import type { Appointment } from '../../types/appointment.types';
import type { TestAssignment, TestDefinition } from '../../types/test.types';

type TabType = 'profile' | 'appointments' | 'tests' | 'notes';

interface PatientInfo {
  displayName: string;
  email: string;
  phone?: string;
  dateOfBirth?: any;
  emergencyContact?: { name: string; phone: string; relationship: string };
}

interface SessionNote {
  id: string;
  type: string;
  content: any;
  sessionDate: any;
  createdAt: any;
}

export function PatientDetail() {
  const { id: patientId } = useParams<{ id: string }>();
  const { currentUser, customClaims } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [relationshipStart, setRelationshipStart] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tests, setTests] = useState<TestAssignment[]>([]);
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showArchivedTests, setShowArchivedTests] = useState(false);
  const [showAssignTest, setShowAssignTest] = useState(false);
  const [availableTests, setAvailableTests] = useState<TestDefinition[]>([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigningTest, setAssigningTest] = useState(false);
  const [assignError, setAssignError] = useState('');

  useEffect(() => {
    if (patientId && currentUser) fetchPatientData();
  }, [patientId, currentUser]);

  const fetchPatientData = async () => {
    if (!patientId || !currentUser) return;

    try {
      // Fetch patient info
      const [userDoc, patientDoc] = await Promise.all([
        getDoc(doc(db, 'users', patientId)),
        getDoc(doc(db, 'patients', patientId)),
      ]);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const patientData = patientDoc.exists() ? patientDoc.data() : {};
        setPatient({
          displayName: userData.displayName || 'Sin nombre',
          email: userData.email,
          phone: patientData.phone,
          dateOfBirth: patientData.dateOfBirth,
          emergencyContact: patientData.emergencyContact,
        });
      }

      // Fetch relationship info
      const relationshipId = `${currentUser.uid}_${patientId}`;
      const relDoc = await getDoc(doc(db, 'therapist_patients', relationshipId));
      if (relDoc.exists()) {
        setRelationshipStart(relDoc.data().relationshipStart);
      }

      // Fetch appointments
      const aptsQuery = query(
        collection(db, 'appointments'),
        where('patientId', '==', patientId),
        where('therapistId', '==', currentUser.uid),
        orderBy('scheduledStart', 'desc')
      );
      const aptsSnap = await getDocs(aptsQuery);
      setAppointments(aptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));

      // Fetch test assignments
      const testsQuery = query(
        collection(db, 'test_assignments'),
        where('patientId', '==', patientId),
        where('therapistId', '==', currentUser.uid)
      );
      const testsSnap = await getDocs(testsQuery);
      setTests(testsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TestAssignment)));

      // Fetch session notes
      const notesQuery = query(
        collection(db, 'session_notes'),
        where('patientId', '==', patientId),
        where('therapistId', '==', currentUser.uid),
        orderBy('sessionDate', 'desc')
      );
      const notesSnap = await getDocs(notesQuery);
      setNotes(notesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SessionNote)));
    } catch (err) {
      console.error('Error fetching patient data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTests = async () => {
    if (!currentUser || !customClaims?.tenantId) return;
    try {
      // Fetch tenant-specific tests
      const tenantQuery = query(
        collection(db, 'test_definitions'),
        where('isActive', '==', true),
        where('tenantId', '==', customClaims.tenantId)
      );
      // Fetch system templates (tenantId == null)
      const systemQuery = query(
        collection(db, 'test_definitions'),
        where('isActive', '==', true),
        where('tenantId', '==', null)
      );
      const [tenantSnap, systemSnap] = await Promise.all([
        getDocs(tenantQuery),
        getDocs(systemQuery),
      ]);
      const all = [
        ...tenantSnap.docs.map(d => ({ id: d.id, ...d.data() } as TestDefinition)),
        ...systemSnap.docs.map(d => ({ id: d.id, ...d.data() } as TestDefinition)),
      ];
      setAvailableTests(all);
    } catch (err) {
      console.error('Error fetching available tests:', err);
    }
  };

  const openAssignModal = () => {
    setShowAssignTest(true);
    setSelectedTestId('');
    setDueDate('');
    setAssignError('');
    fetchAvailableTests();
  };

  const handleAssignTest = async () => {
    if (!selectedTestId || !currentUser || !customClaims?.tenantId || !patientId) return;

    const selectedTest = availableTests.find(t => t.id === selectedTestId);
    if (!selectedTest) return;

    setAssigningTest(true);
    setAssignError('');

    try {
      await addDoc(collection(db, 'test_assignments'), {
        testId: selectedTest.id,
        testTitle: selectedTest.title,
        therapistId: currentUser.uid,
        patientId,
        tenantId: customClaims.tenantId,
        assignedAt: Timestamp.now(),
        dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
        status: 'PENDING',
        responses: [],
      });

      setShowAssignTest(false);
      fetchPatientData();
    } catch (err: any) {
      console.error('Error assigning test:', err);
      setAssignError(err.message || 'Error al asignar el test');
    } finally {
      setAssigningTest(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const calculateAge = (dateOfBirth: any) => {
    if (!dateOfBirth) return null;
    const birth = dateOfBirth.toDate?.() || new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-teal-100 text-teal-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-sage-200 text-sage-600',
    NO_SHOW: 'bg-coral-100 text-coral-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
  };

  const statusLabels: Record<string, string> = {
    SCHEDULED: 'Programada',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
    NO_SHOW: 'No asistió',
    PENDING: 'Pendiente',
    IN_PROGRESS: 'En Progreso',
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto">
          <p className="text-sage-600">Cargando datos del paciente...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!patient) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto">
          <Card><p className="text-coral-600">Paciente no encontrado</p></Card>
        </div>
      </DashboardLayout>
    );
  }

  const activeTests = tests.filter(t => !t.isArchived);
  const archivedTests = tests.filter(t => t.isArchived);
  const visibleTests = showArchivedTests ? tests : activeTests;

  const handleArchiveTest = async (assignmentId: string) => {
    try {
      await updateDoc(doc(db, 'test_assignments', assignmentId), {
        isArchived: true,
        archivedAt: Timestamp.now(),
      });
      setTests(prev =>
        prev.map(t => t.id === assignmentId ? { ...t, isArchived: true, archivedAt: Timestamp.now() } : t)
      );
    } catch (error) {
      console.error('Error archiving test:', error);
    }
  };

  const handleUnarchiveTest = async (assignmentId: string) => {
    try {
      await updateDoc(doc(db, 'test_assignments', assignmentId), {
        isArchived: false,
        archivedAt: null,
      });
      setTests(prev =>
        prev.map(t => t.id === assignmentId ? { ...t, isArchived: false, archivedAt: undefined } : t)
      );
    } catch (error) {
      console.error('Error unarchiving test:', error);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'Perfil' },
    { id: 'appointments' as const, label: `Citas (${appointments.length})` },
    { id: 'tests' as const, label: `Tests (${activeTests.length})` },
    { id: 'notes' as const, label: `Notas (${notes.length})` },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <button
              onClick={() => navigate(ROUTES.THERAPIST_PATIENTS)}
              className="text-sm text-teal-600 hover:text-teal-800 mb-2 inline-block"
            >
              &larr; Volver a Pacientes
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-sage-900">
              {patient.displayName}
            </h1>
            <p className="text-sage-600">{patient.email}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => navigate(ROUTES.THERAPIST_APPOINTMENTS + '?patientId=' + patientId)}
              className="text-sm"
            >
              Nueva Cita
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowTransfer(true)}
              className="text-sm text-coral-600 hover:bg-coral-50"
            >
              Transferir Paciente
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-sage-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold transition-all whitespace-nowrap text-sm ${
                activeTab === tab.id
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-sage-600 hover:text-sage-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card elevated>
              <h3 className="text-lg font-semibold text-sage-900 mb-4">Información Personal</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-sage-500">Nombre</p>
                  <p className="font-medium text-sage-900">{patient.displayName}</p>
                </div>
                <div>
                  <p className="text-sm text-sage-500">Email</p>
                  <p className="font-medium text-sage-900">{patient.email}</p>
                </div>
                {patient.phone && (
                  <div>
                    <p className="text-sm text-sage-500">Teléfono</p>
                    <p className="font-medium text-sage-900">{patient.phone}</p>
                  </div>
                )}
                {patient.dateOfBirth && (
                  <div>
                    <p className="text-sm text-sage-500">Edad</p>
                    <p className="font-medium text-sage-900">
                      {calculateAge(patient.dateOfBirth)} años ({formatDate(patient.dateOfBirth)})
                    </p>
                  </div>
                )}
                {relationshipStart && (
                  <div>
                    <p className="text-sm text-sage-500">Paciente desde</p>
                    <p className="font-medium text-sage-900">{formatDate(relationshipStart)}</p>
                  </div>
                )}
              </div>
            </Card>

            {patient.emergencyContact && (
              <Card elevated>
                <h3 className="text-lg font-semibold text-sage-900 mb-4">Contacto de Emergencia</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-sage-500">Nombre</p>
                    <p className="font-medium text-sage-900">{patient.emergencyContact.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-sage-500">Teléfono</p>
                    <p className="font-medium text-sage-900">{patient.emergencyContact.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-sage-500">Relación</p>
                    <p className="font-medium text-sage-900">{patient.emergencyContact.relationship}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="space-y-3">
            {appointments.length === 0 ? (
              <Card><p className="text-sage-600 text-center py-8">No hay citas registradas con este paciente</p></Card>
            ) : (
              appointments.map((apt) => {
                const start = apt.scheduledStart?.toDate?.() || new Date();
                const end = apt.scheduledEnd?.toDate?.() || new Date();
                return (
                  <Card key={apt.id}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[apt.status]}`}>
                            {statusLabels[apt.status]}
                          </span>
                          {apt.isVirtual && (
                            <span className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full">Virtual</span>
                          )}
                        </div>
                        <p className="font-medium text-sage-900">{formatDate(apt.scheduledStart)}</p>
                        <p className="text-sm text-sage-600">
                          {start.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {apt.notes && <p className="text-sm text-sage-500 mt-1">{apt.notes}</p>}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Tests Tab */}
        {activeTab === 'tests' && (() => {
          const pendingTests = visibleTests
            .filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS')
            .sort((a, b) => {
              const aTime = a.assignedAt?.toDate?.()?.getTime() || 0;
              const bTime = b.assignedAt?.toDate?.()?.getTime() || 0;
              return bTime - aTime;
            });
          const completedTests = visibleTests
            .filter(t => t.status === 'COMPLETED')
            .sort((a, b) => {
              const aTime = a.completedAt?.toDate?.()?.getTime() || a.assignedAt?.toDate?.()?.getTime() || 0;
              const bTime = b.completedAt?.toDate?.()?.getTime() || b.assignedAt?.toDate?.()?.getTime() || 0;
              return bTime - aTime;
            });

          const renderTestCard = (test: TestAssignment) => (
            <Card key={test.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[test.status]}`}>
                      {statusLabels[test.status]}
                    </span>
                    {test.isArchived && (
                      <span className="text-xs px-2 py-0.5 bg-sage-100 text-sage-600 rounded-full">
                        Archivado
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-sage-900">{test.testTitle}</p>
                  <p className="text-sm text-sage-600">
                    Asignado: {formatDate(test.assignedAt)}
                    {test.completedAt && ` | Completado: ${formatDate(test.completedAt)}`}
                  </p>
                  <p className="text-sm text-sage-500">
                    {test.responses?.length || 0} respuesta{(test.responses?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {test.status === 'COMPLETED' && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => navigate(`/therapist/tests/${test.testId}/results`)}
                        className="text-sm"
                      >
                        Ver Resultados
                      </Button>
                      {test.isArchived ? (
                        <Button
                          variant="ghost"
                          onClick={() => handleUnarchiveTest(test.id)}
                          className="text-sm"
                        >
                          Desarchivar
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          onClick={() => handleArchiveTest(test.id)}
                          className="text-sm"
                        >
                          Archivar
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          );

          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Button variant="primary" onClick={openAssignModal} className="text-sm">
                  Asignar Test
                </Button>
                {archivedTests.length > 0 && (
                  <button
                    onClick={() => setShowArchivedTests(!showArchivedTests)}
                    className="text-sm text-teal-600 hover:text-teal-800 font-medium"
                  >
                    {showArchivedTests
                      ? 'Ocultar archivados'
                      : `Mostrar archivados (${archivedTests.length})`}
                  </button>
                )}
              </div>

              {pendingTests.length === 0 && completedTests.length === 0 ? (
                <Card><p className="text-sage-600 text-center py-8">No hay tests asignados a este paciente</p></Card>
              ) : (
                <>
                  {pendingTests.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-sage-700 uppercase tracking-wide pt-2">Pendientes</h3>
                      {pendingTests.map(renderTestCard)}
                    </div>
                  )}
                  {completedTests.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-sage-700 uppercase tracking-wide pt-2">Completados</h3>
                      {completedTests.map(renderTestCard)}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-3">
            {notes.length === 0 ? (
              <Card><p className="text-sage-600 text-center py-8">No hay notas de sesión para este paciente</p></Card>
            ) : (
              notes.map((note) => {
                const noteTypeLabels: Record<string, string> = {
                  SOAP: 'SOAP', DAP: 'DAP', PROGRESS: 'Progreso', INTAKE: 'Evaluación Inicial', DISCHARGE: 'Alta',
                };
                return (
                  <Card key={note.id}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 font-medium">
                            {noteTypeLabels[note.type] || note.type}
                          </span>
                        </div>
                        <p className="font-medium text-sage-900">{formatDate(note.sessionDate)}</p>
                        {note.content?.subjective && (
                          <p className="text-sm text-sage-600 mt-1 line-clamp-2">{note.content.subjective}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Assign Test Modal */}
        {showAssignTest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6">
              <h3 className="text-xl font-semibold text-sage-900 mb-2">Asignar Test</h3>
              <p className="text-sm text-sage-600 mb-4">
                Selecciona un test para asignar a <strong>{patient.displayName}</strong>
              </p>

              {assignError && (
                <div className="bg-coral-50 border border-coral-200 text-coral-700 px-3 py-2 rounded-lg text-sm mb-4">
                  {assignError}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="label mb-2 block">Test *</label>
                  {availableTests.length === 0 ? (
                    <p className="text-sage-600 text-sm">No hay tests disponibles.</p>
                  ) : (
                    <select
                      value={selectedTestId}
                      onChange={(e) => setSelectedTestId(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Seleccionar test...</option>
                      {availableTests.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.questions.length} pregunta{t.questions.length !== 1 ? 's' : ''})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="label mb-2 block">Fecha Límite (opcional)</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setShowAssignTest(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAssignTest}
                  isLoading={assigningTest}
                  disabled={!selectedTestId || assigningTest}
                  className="flex-1"
                >
                  Asignar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        {showTransfer && patientId && (
          <TransferPatientModal
            patientId={patientId}
            patientName={patient.displayName}
            onClose={() => setShowTransfer(false)}
            onTransferred={() => navigate(ROUTES.THERAPIST_PATIENTS)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// Inline Transfer Modal (will be extracted to separate component in Feature E)
function TransferPatientModal({ patientId, patientName, onClose, onTransferred }: {
  patientId: string; patientName: string; onClose: () => void; onTransferred: () => void;
}) {
  const { currentUser, customClaims } = useAuth();
  const [therapists, setTherapists] = useState<{ uid: string; displayName: string; tenantId: string }[]>([]);
  const [selectedTherapist, setSelectedTherapist] = useState('');
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTherapists();
  }, []);

  const fetchTherapists = async () => {
    try {
      const snap = await getDocs(query(
        collection(db, 'therapists'),
        where('isVerified', '==', true)
      ));
      const list = snap.docs
        .filter(d => d.id !== currentUser?.uid)
        .map(d => {
          const data = d.data();
          return { uid: d.id, displayName: data.displayName || data.email || d.id, tenantId: data.tenantId };
        });

      // Also fetch user display names
      const userSnap = await getDocs(collection(db, 'users'));
      const nameMap = new Map<string, string>();
      userSnap.docs.forEach(d => {
        const data = d.data();
        nameMap.set(d.id, data.displayName || data.email);
      });

      setTherapists(list.map(t => ({ ...t, displayName: nameMap.get(t.uid) || t.displayName })));
    } catch (err) {
      console.error('Error fetching therapists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedTherapist || !currentUser || !customClaims?.tenantId) return;

    setTransferring(true);
    setError('');

    try {
      const newTherapist = therapists.find(t => t.uid === selectedTherapist);
      if (!newTherapist) throw new Error('Terapeuta no encontrado');

      // 1. Deactivate old relationship
      const oldRelId = `${currentUser.uid}_${patientId}`;
      const { updateDoc: updateDocFn, Timestamp: TimestampFn } = await import('firebase/firestore');
      await updateDocFn(doc(db, 'therapist_patients', oldRelId), {
        status: 'INACTIVE',
        relationshipEnd: TimestampFn.now(),
      });

      // 2. Create new relationship
      const { setDoc } = await import('firebase/firestore');
      const newRelId = `${selectedTherapist}_${patientId}`;
      await setDoc(doc(db, 'therapist_patients', newRelId), {
        therapistId: selectedTherapist,
        patientId,
        tenantId: newTherapist.tenantId,
        status: 'ACTIVE',
        relationshipStart: TimestampFn.now(),
        notes: `Transferido desde ${currentUser.uid}`,
        auditLog: [{
          timestamp: TimestampFn.now(),
          userId: currentUser.uid,
          action: 'CREATE',
          changes: { transferredFrom: currentUser.uid },
        }],
      });

      // 3. Update future scheduled appointments
      const futureAptsQuery = query(
        collection(db, 'appointments'),
        where('patientId', '==', patientId),
        where('therapistId', '==', currentUser.uid),
        where('status', '==', 'SCHEDULED')
      );
      const futureSnap = await getDocs(futureAptsQuery);
      await Promise.all(futureSnap.docs.map(d =>
        updateDocFn(doc(db, 'appointments', d.id), {
          therapistId: selectedTherapist,
          tenantId: newTherapist.tenantId,
          updatedAt: TimestampFn.now(),
        })
      ));

      // 4. Call Cloud Function to update custom claims (if available)
      try {
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('../../config/firebase');
        const transferFn = httpsCallable(functions, 'transferPatient');
        await transferFn({
          patientId,
          oldTherapistId: currentUser.uid,
          newTherapistId: selectedTherapist,
        });
      } catch (fnErr) {
        // Cloud function may not be deployed yet; transfer still works at Firestore level
        console.warn('Cloud function transferPatient not available:', fnErr);
      }

      onTransferred();
    } catch (err: any) {
      console.error('Transfer error:', err);
      setError(err.message || 'Error al transferir el paciente');
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-sage-900 mb-2">Transferir Paciente</h3>
        <p className="text-sm text-sage-600 mb-4">
          Transferir a <strong>{patientName}</strong> a otro terapeuta. Las citas futuras se reasignarán automáticamente.
        </p>

        {error && (
          <div className="bg-coral-50 border border-coral-200 text-coral-700 px-3 py-2 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sage-600 text-sm">Cargando terapeutas...</p>
        ) : (
          <div className="mb-6">
            <label className="label mb-2 block">Seleccionar Terapeuta</label>
            <select
              value={selectedTherapist}
              onChange={(e) => setSelectedTherapist(e.target.value)}
              className="input-field"
            >
              <option value="">Seleccionar...</option>
              {therapists.map((t) => (
                <option key={t.uid} value={t.uid}>{t.displayName}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button
            variant="primary"
            onClick={handleTransfer}
            isLoading={transferring}
            disabled={!selectedTherapist || transferring}
            className="flex-1"
          >
            Confirmar Transferencia
          </Button>
        </div>
      </div>
    </div>
  );
}
