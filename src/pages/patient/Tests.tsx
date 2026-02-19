import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { DashboardLayout } from '../../components/layout';
import { Card, Button } from '../../components/common';
import type { TestAssignment } from '../../types/test.types';

export function PatientTests() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [pendingTests, setPendingTests] = useState<TestAssignment[]>([]);
  const [completedTests, setCompletedTests] = useState<TestAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  useEffect(() => {
    if (currentUser) {
      fetchTests();
    }
  }, [currentUser]);

  const fetchTests = async () => {
    if (!currentUser) return;

    try {
      const assignmentsQuery = query(
        collection(db, 'test_assignments'),
        where('patientId', '==', currentUser.uid),
        orderBy('assignedAt', 'desc')
      );

      const snapshot = await getDocs(assignmentsQuery);
      const assignments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as TestAssignment[];

      setPendingTests(assignments.filter(a => a.status !== 'COMPLETED'));
      setCompletedTests(assignments.filter(a => a.status === 'COMPLETED'));
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return null;
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isOverdue = (dueDate: any) => {
    if (!dueDate) return false;
    const date = dueDate.toDate?.() || new Date(dueDate);
    return date < new Date();
  };

  const getDaysRemaining = (dueDate: any) => {
    if (!dueDate) return null;
    const date = dueDate.toDate?.() || new Date(dueDate);
    const today = new Date();
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto">
          <p className="text-sage-600">Cargando tests...</p>
        </div>
      </DashboardLayout>
    );
  }

  const displayTests = activeTab === 'pending' ? pendingTests : completedTests;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-sage-900 mb-2">
          Mis Evaluaciones
        </h1>
        <p className="text-sage-600 mb-8">
          Completa las evaluaciones asignadas por tu terapeuta
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-sage-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'pending'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-sage-600 hover:text-sage-900'
            }`}
          >
            📝 Pendientes ({pendingTests.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'completed'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-sage-600 hover:text-sage-900'
            }`}
          >
            ✅ Completados ({completedTests.length})
          </button>
        </div>

        {/* Tests List */}
        {displayTests.length === 0 ? (
          <Card elevated>
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-sage-900 mb-2">
                {activeTab === 'pending'
                  ? 'No hay evaluaciones pendientes'
                  : 'No has completado evaluaciones'}
              </h3>
              <p className="text-sage-600">
                {activeTab === 'pending'
                  ? 'Tu terapeuta te asignará evaluaciones cuando sea necesario'
                  : 'Las evaluaciones completadas aparecerán aquí'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {displayTests.map((assignment) => {
              const daysRemaining = getDaysRemaining(assignment.dueDate);
              const overdue = isOverdue(assignment.dueDate);

              return (
                <Card key={assignment.id} elevated>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-sage-900">
                          {assignment.testTitle}
                        </h3>
                        {assignment.status === 'IN_PROGRESS' && (
                          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-lg">
                            En Progreso
                          </span>
                        )}
                        {assignment.status === 'COMPLETED' && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-lg">
                            Completado
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-sage-600">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">📅</span>
                          Asignado: {formatDate(assignment.assignedAt)}
                        </div>

                        {assignment.dueDate && (
                          <div className={`flex items-center gap-1 ${overdue ? 'text-coral-600' : ''}`}>
                            <span className="font-medium">⏰</span>
                            {overdue ? (
                              <span className="font-semibold">Vencido hace {Math.abs(daysRemaining!)} día{Math.abs(daysRemaining!) !== 1 ? 's' : ''}</span>
                            ) : daysRemaining !== null && daysRemaining === 0 ? (
                              <span className="font-semibold">Vence hoy</span>
                            ) : daysRemaining !== null && daysRemaining > 0 ? (
                              <span>Vence en {daysRemaining} día{daysRemaining !== 1 ? 's' : ''}</span>
                            ) : (
                              <span>Fecha límite: {formatDate(assignment.dueDate)}</span>
                            )}
                          </div>
                        )}

                        {assignment.completedAt && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">✓</span>
                            Completado: {formatDate(assignment.completedAt)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      {assignment.status !== 'COMPLETED' ? (
                        <Button
                          variant="primary"
                          onClick={() => navigate(`/patient/tests/${assignment.id}/take`)}
                        >
                          {assignment.status === 'IN_PROGRESS' ? 'Continuar' : 'Comenzar'}
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/patient/tests/${assignment.id}/review`)}
                        >
                          Ver Respuestas
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
