import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { DashboardLayout } from '../../components/layout';
import { Card, Button } from '../../components/common';
import { CopyTestModal } from '../../components/therapist/CopyTestModal';
import type { TestDefinition } from '../../types/test.types';

export function Tests() {
  const { currentUser, customClaims } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'my-tests' | 'templates'>('my-tests');
  const [tests, setTests] = useState<TestDefinition[]>([]);
  const [systemTemplates, setSystemTemplates] = useState<TestDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateToCopy, setTemplateToCopy] = useState<TestDefinition | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser && customClaims?.tenantId) {
      fetchTests();
    }
  }, [currentUser, customClaims]);

  const fetchTests = async () => {
    if (!currentUser || !customClaims?.tenantId) return;

    try {
      // Fetch therapist's own tests
      const therapistTestsQuery = query(
        collection(db, 'test_definitions'),
        where('tenantId', '==', customClaims.tenantId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      // Fetch system templates
      const systemTemplatesQuery = query(
        collection(db, 'test_definitions'),
        where('isSystemTemplate', '==', true),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      const [therapistSnapshot, systemSnapshot] = await Promise.all([
        getDocs(therapistTestsQuery),
        getDocs(systemTemplatesQuery)
      ]);

      const therapistTests = therapistSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as TestDefinition[];

      const systemTests = systemSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as TestDefinition[];

      setTests(therapistTests);
      setSystemTemplates(systemTests);
    } catch (error) {
      console.error('Error fetching tests:', error);
      setError('Error al cargar los tests');
    } finally {
      setLoading(false);
    }
  };

  const copyTemplate = async (customTitle: string) => {
    if (!currentUser || !customClaims?.tenantId || !templateToCopy) return;

    try {
      const newTestData = {
        title: customTitle,
        description: templateToCopy.description,
        instructions: templateToCopy.instructions || null,
        questions: [...templateToCopy.questions],

        tenantId: customClaims.tenantId,
        createdBy: currentUser.uid,
        isSystemTemplate: false,
        sourceTemplateId: templateToCopy.id,
        category: templateToCopy.category || null,

        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'test_definitions'), newTestData);

      // Close modal and refresh
      setTemplateToCopy(null);
      await fetchTests();
      setActiveTab('my-tests');
    } catch (err: any) {
      console.error('Error copying template:', err);
      throw new Error(err.message || 'Error al copiar la plantilla');
    }
  };

  const handleCopyTemplate = (template: TestDefinition) => {
    setTemplateToCopy(template);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-sage-900">
              Tests Psicológicos
            </h1>
            <p className="text-sm sm:text-base text-sage-600 mt-2">
              Gestiona tus evaluaciones y asigna tests a pacientes
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate('/therapist/tests/create')}
            className="w-full sm:w-auto whitespace-nowrap"
          >
            + Crear Nuevo Test
          </Button>
        </div>

        {error && (
          <div className="bg-coral-50 border border-coral-200 text-coral-700 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex border-b border-sage-200">
            <button
              onClick={() => setActiveTab('my-tests')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'my-tests'
                  ? 'border-b-2 border-teal-600 text-teal-600'
                  : 'text-sage-600 hover:text-sage-900'
              }`}
            >
              Mis Tests ({tests.length})
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'templates'
                  ? 'border-b-2 border-teal-600 text-teal-600'
                  : 'text-sage-600 hover:text-sage-900'
              }`}
            >
              Plantillas del Sistema ({systemTemplates.length})
            </button>
          </div>
        </div>

        {loading ? (
          <Card>
            <p className="text-sage-600">Cargando tests...</p>
          </Card>
        ) : (
          <>
            {/* My Tests Tab */}
            {activeTab === 'my-tests' && (
              <>
                {tests.length === 0 ? (
                  <Card elevated>
                    <div className="text-center py-12">
                      <h3 className="text-xl font-semibold text-sage-900 mb-2">
                        No hay tests creados
                      </h3>
                      <p className="text-sage-600 mb-6">
                        Crea tu primer test o copia una plantilla del sistema para comenzar
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                          variant="primary"
                          onClick={() => navigate('/therapist/tests/create')}
                        >
                          Crear Nuevo Test
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setActiveTab('templates')}
                        >
                          Ver Plantillas del Sistema
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {tests.map((test) => (
                      <Card key={test.id} elevated>
                        <div className="flex flex-col h-full">
                          <div className="flex-1">
                            {test.sourceTemplateId && (
                              <span className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-lg mb-2">
                                Copiado de plantilla
                              </span>
                            )}
                            <h3 className="text-xl font-semibold text-sage-900 mb-2">
                              {test.title}
                            </h3>
                            <p className="text-sage-600 text-sm mb-4">
                              {test.description}
                            </p>

                            <div className="flex flex-wrap gap-3 text-sm text-sage-600">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">📝</span>
                                {test.questions.length} pregunta{test.questions.length !== 1 ? 's' : ''}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">📅</span>
                                {formatDate(test.createdAt)}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-6 pt-6 border-t border-sage-200">
                            <Button
                              variant="primary"
                              onClick={() => navigate(`/therapist/tests/${test.id}/assign`)}
                              className="flex-1 text-sm"
                            >
                              Asignar a Paciente
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => navigate(`/therapist/tests/${test.id}/results`)}
                              className="flex-1 text-sm"
                            >
                              Ver Resultados
                            </Button>
                            {test.createdBy === currentUser?.uid && (
                              <Button
                                variant="ghost"
                                onClick={() => navigate(`/therapist/tests/${test.id}/edit`)}
                                className="flex-1 text-sm"
                              >
                                Editar
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* System Templates Tab */}
            {activeTab === 'templates' && (
              <>
                {systemTemplates.length === 0 ? (
                  <Card elevated>
                    <div className="text-center py-12">
                      <h3 className="text-xl font-semibold text-sage-900 mb-2">
                        No hay plantillas del sistema disponibles
                      </h3>
                      <p className="text-sage-600 mb-6">
                        Las plantillas del sistema estarán disponibles pronto
                      </p>
                    </div>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {systemTemplates.map((template) => (
                      <Card key={template.id} elevated>
                        <div className="flex flex-col h-full">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-lg">
                                Plantilla del Sistema
                              </span>
                              {template.category && (
                                <span className="inline-block px-2 py-1 text-xs bg-sage-100 text-sage-700 rounded-lg">
                                  {template.category}
                                </span>
                              )}
                            </div>
                            <h3 className="text-xl font-semibold text-sage-900 mb-2">
                              {template.title}
                            </h3>
                            <p className="text-sage-600 text-sm mb-4">
                              {template.description}
                            </p>

                            <div className="text-sm text-sage-600">
                              📝 {template.questions.length} pregunta{template.questions.length !== 1 ? 's' : ''}
                            </div>
                          </div>

                          <div className="flex gap-2 mt-6 pt-6 border-t border-sage-200">
                            <Button
                              variant="primary"
                              onClick={() => handleCopyTemplate(template)}
                              className="flex-1"
                            >
                              Copiar Plantilla
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Copy Template Modal */}
      {templateToCopy && (
        <CopyTestModal
          template={templateToCopy}
          onCopy={copyTemplate}
          onCancel={() => setTemplateToCopy(null)}
        />
      )}
    </DashboardLayout>
  );
}
