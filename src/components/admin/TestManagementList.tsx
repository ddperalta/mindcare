import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Card, Button } from '../common';
import { ROUTES } from '../../config/constants';

type SubTab = 'assignments' | 'definitions';

interface TestResponse {
  questionId: string;
  questionText: string;
  questionType: string;
  answer: string | number | boolean;
  answerText?: string;
  answeredAt: any;
}

interface AssignmentData {
  id: string;
  testId: string;
  testTitle: string;
  therapistId: string;
  patientId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  assignedAt: any;
  dueDate?: any;
  completedAt?: any;
  responses: TestResponse[];
}

interface DefinitionData {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  isSystemTemplate: boolean;
  isActive: boolean;
  category?: string;
  createdAt: any;
  assignmentCount: number;
}

interface EnrichedAssignment extends AssignmentData {
  therapistName: string;
  patientName: string;
}

// Response Display Component (reused from TestResults pattern)
function ResponseDisplay({ response }: { response: TestResponse }) {
  switch (response.questionType) {
    case 'TEXT':
      return (
        <div className="p-3 bg-sage-50 rounded-lg">
          <p className="text-sage-900 whitespace-pre-wrap text-sm">{String(response.answer) || 'Sin respuesta'}</p>
        </div>
      );
    case 'MULTIPLE_CHOICE':
      return (
        <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
          <p className="text-teal-900 font-semibold text-sm">{response.answerText || String(response.answer)}</p>
        </div>
      );
    case 'SCALE':
      return (
        <div className="p-3 bg-sage-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-teal-600">{String(response.answer)}</div>
            <div className="flex-1 h-2 bg-sage-200 rounded-full">
              <div
                className="h-full bg-teal-600 rounded-full"
                style={{ width: `${(Number(response.answer) / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>
      );
    case 'YES_NO':
      return (
        <div className="p-3 bg-sage-50 rounded-lg">
          <p className="text-sage-900 font-semibold text-sm">
            {response.answer === true ? 'Si' : response.answer === false ? 'No' : 'Sin respuesta'}
          </p>
        </div>
      );
    default:
      return <p className="text-sage-600 text-sm">{String(response.answer)}</p>;
  }
}

export function TestManagementList() {
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState<SubTab>('definitions');
  const [assignments, setAssignments] = useState<EnrichedAssignment[]>([]);
  const [definitions, setDefinitions] = useState<DefinitionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [filterType, setFilterType] = useState<'TEMPLATES' | 'THERAPIST' | 'ALL'>('TEMPLATES');
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignmentsSnapshot, usersSnapshot, definitionsSnapshot] = await Promise.all([
        getDocs(collection(db, 'test_assignments')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'test_definitions')),
      ]);

      // User name map
      const userNameMap = new Map<string, string>();
      usersSnapshot.docs.forEach(d => {
        const data = d.data();
        userNameMap.set(d.id, data.displayName || data.email);
      });

      // Count assignments per definition
      const defAssignmentCount = new Map<string, number>();
      assignmentsSnapshot.docs.forEach(d => {
        const data = d.data();
        defAssignmentCount.set(data.testId, (defAssignmentCount.get(data.testId) || 0) + 1);
      });

      // Enrich assignments
      const enrichedAssignments: EnrichedAssignment[] = assignmentsSnapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          testId: data.testId,
          testTitle: data.testTitle,
          therapistId: data.therapistId,
          patientId: data.patientId,
          status: data.status,
          assignedAt: data.assignedAt,
          dueDate: data.dueDate,
          completedAt: data.completedAt,
          responses: data.responses || [],
          therapistName: userNameMap.get(data.therapistId) || 'Desconocido',
          patientName: userNameMap.get(data.patientId) || 'Desconocido',
        };
      });

      // Sort by assigned date descending
      enrichedAssignments.sort((a, b) => {
        const aTime = a.assignedAt?.toMillis?.() || 0;
        const bTime = b.assignedAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      // Enrich definitions
      const enrichedDefinitions: DefinitionData[] = definitionsSnapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title,
          description: data.description,
          createdBy: data.createdBy === 'SYSTEM'
            ? 'Sistema'
            : userNameMap.get(data.createdBy) || data.createdBy,
          isSystemTemplate: data.isSystemTemplate || false,
          isActive: data.isActive ?? true,
          category: data.category,
          createdAt: data.createdAt,
          assignmentCount: defAssignmentCount.get(d.id) || 0,
        };
      });

      // Compute stats
      const completed = enrichedAssignments.filter(a => a.status === 'COMPLETED').length;
      const pending = enrichedAssignments.filter(a => a.status === 'PENDING').length;
      const inProgress = enrichedAssignments.filter(a => a.status === 'IN_PROGRESS').length;

      setStats({
        total: enrichedAssignments.length,
        completed,
        pending,
        inProgress,
      });

      setAssignments(enrichedAssignments);
      setDefinitions(enrichedDefinitions);
    } catch (error) {
      console.error('Error fetching test data:', error);
    } finally {
      setLoading(false);
    }
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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
      COMPLETED: 'bg-green-100 text-green-800 border-green-200',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Pendiente',
      IN_PROGRESS: 'En Progreso',
      COMPLETED: 'Completado',
    };
    return labels[status] || status;
  };

  const filteredAssignments = assignments.filter(a => {
    if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
    return true;
  });

  const filteredDefinitions = definitions.filter(def => {
    if (filterType === 'TEMPLATES' && !def.isSystemTemplate) return false;
    if (filterType === 'THERAPIST' && def.isSystemTemplate) return false;
    if (filterActive === 'ACTIVE' && !def.isActive) return false;
    if (filterActive === 'INACTIVE' && def.isActive) return false;
    return true;
  });

  if (loading) {
    return (
      <Card>
        <p className="text-sage-600">Cargando datos de tests...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-sage-600">Total Asignados</p>
          <p className="text-3xl font-bold text-sage-900">{stats.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-sage-600">Completados</p>
          <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
        </Card>
        <Card>
          <p className="text-sm text-sage-600">Pendientes</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
        </Card>
        <Card>
          <p className="text-sm text-sage-600">En Progreso</p>
          <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
        </Card>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-sage-200">
        <button
          onClick={() => setSubTab('assignments')}
          className={`px-4 py-2 text-sm font-semibold transition-all ${
            subTab === 'assignments'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-sage-600 hover:text-sage-900'
          }`}
        >
          Asignaciones ({assignments.length})
        </button>
        <button
          onClick={() => setSubTab('definitions')}
          className={`px-4 py-2 text-sm font-semibold transition-all ${
            subTab === 'definitions'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-sage-600 hover:text-sage-900'
          }`}
        >
          Catálogo de Tests ({definitions.length})
        </button>
      </div>

      {/* Assignments View */}
      {subTab === 'assignments' && (
        <div className="space-y-4">
          {/* Status Filter */}
          <Card>
            <div className="flex gap-4 flex-wrap items-end">
              <div>
                <label className="label mb-2 block text-sm">Filtrar por Estado</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="input-field text-sm"
                >
                  <option value="ALL">Todos</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="IN_PROGRESS">En Progreso</option>
                  <option value="COMPLETED">Completado</option>
                </select>
              </div>
              <p className="text-sm text-sage-600">
                Mostrando {filteredAssignments.length} de {assignments.length} asignaciones
              </p>
            </div>
          </Card>

          {filteredAssignments.length === 0 ? (
            <Card>
              <p className="text-sage-600 text-center py-8">
                No se encontraron asignaciones con los filtros seleccionados
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((assignment) => (
                <Card key={assignment.id} elevated>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded-lg border ${getStatusBadge(assignment.status)}`}>
                          {getStatusLabel(assignment.status)}
                        </span>
                        {assignment.status === 'COMPLETED' && (
                          <span className="text-xs text-sage-500">
                            {assignment.responses.length} respuesta{assignment.responses.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-sage-900">
                        {assignment.testTitle}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-sage-600">
                        <div>
                          <span className="font-medium">Paciente:</span> {assignment.patientName}
                        </div>
                        <div>
                          <span className="font-medium">Terapeuta:</span> {assignment.therapistName}
                        </div>
                        <div>
                          <span className="font-medium">Asignado:</span> {formatDate(assignment.assignedAt)}
                        </div>
                        {assignment.dueDate && (
                          <div>
                            <span className="font-medium">Vence:</span> {formatDate(assignment.dueDate)}
                          </div>
                        )}
                        {assignment.completedAt && (
                          <div>
                            <span className="font-medium">Completado:</span> {formatDate(assignment.completedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                    {assignment.status === 'COMPLETED' && assignment.responses.length > 0 && (
                      <button
                        onClick={() => setExpandedId(expandedId === assignment.id ? null : assignment.id)}
                        className="ml-4 px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      >
                        {expandedId === assignment.id ? 'Ocultar' : 'Ver Respuestas'}
                      </button>
                    )}
                  </div>

                  {/* Expanded Responses */}
                  {expandedId === assignment.id && assignment.responses.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-sage-200 space-y-4">
                      {assignment.responses.map((response, index) => (
                        <div key={response.questionId} className="pb-4 border-b border-sage-100 last:border-0 last:pb-0">
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-sm font-semibold text-sage-500">{index + 1}.</span>
                            <p className="flex-1 font-medium text-sage-800 text-sm">{response.questionText}</p>
                          </div>
                          <div className="ml-5">
                            <ResponseDisplay response={response} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Definitions View */}
      {subTab === 'definitions' && (
        <div className="space-y-3">
          {/* Toolbar */}
          <Card>
            <div className="flex flex-wrap gap-4 items-end">
              <Button
                onClick={() => navigate(ROUTES.ADMIN_TEMPLATE_CREATE)}
                variant="primary"
              >
                + Nuevo Template
              </Button>
              <div>
                <label className="label mb-2 block text-sm">Tipo</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="input-field text-sm"
                >
                  <option value="TEMPLATES">Sistema</option>
                  <option value="THERAPIST">Terapeutas</option>
                  <option value="ALL">Todos</option>
                </select>
              </div>
              <div>
                <label className="label mb-2 block text-sm">Estado</label>
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value as any)}
                  className="input-field text-sm"
                >
                  <option value="ALL">Todos</option>
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
              </div>
              <p className="text-sm text-sage-600">
                Mostrando {filteredDefinitions.length} de {definitions.length} definiciones
              </p>
            </div>
          </Card>

          {filteredDefinitions.length === 0 ? (
            <Card>
              <p className="text-sage-600 text-center py-8">
                No se encontraron definiciones con los filtros seleccionados
              </p>
            </Card>
          ) : (
            filteredDefinitions.map((def) => (
              <Card key={def.id} elevated>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-lg border ${
                          def.isSystemTemplate
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : 'bg-teal-100 text-teal-800 border-teal-200'
                        }`}
                      >
                        {def.isSystemTemplate ? '🏛️ Sistema' : '👨‍⚕️ Terapeuta'}
                      </span>
                      {def.category && (
                        <span className="text-xs px-2 py-0.5 bg-sage-100 text-sage-700 rounded-full">
                          {def.category}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-1 rounded-lg border ${
                          def.isActive
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {def.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-sage-900">{def.title}</p>
                    <p className="text-sm text-sage-600 mt-1">{def.description}</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-sage-500">
                      <div>
                        <span className="font-medium">Creador:</span> {def.createdBy}
                      </div>
                      <div>
                        <span className="font-medium">Asignaciones:</span> {def.assignmentCount}
                      </div>
                      <div>
                        <span className="font-medium">Creado:</span> {formatDate(def.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
