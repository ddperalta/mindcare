import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { DashboardLayout } from '../../components/layout';
import { Card, Button } from '../../components/common';
import type { TestDefinition } from '../../types/test.types';
import { ROUTES } from '../../config/constants';

export function AdminTestTemplates() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TestDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchTemplates();
    }
  }, [currentUser]);

  const fetchTemplates = async () => {
    try {
      const templatesQuery = query(
        collection(db, 'test_definitions'),
        where('isSystemTemplate', '==', true),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(templatesQuery);
      const templatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as TestDefinition[];

      setTemplates(templatesData);
    } catch (error) {
      console.error('Error fetching templates:', error);
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
    });
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-sage-900">
              Plantillas del Sistema
            </h1>
            <p className="text-sm sm:text-base text-sage-600 mt-2">
              Gestiona las plantillas de tests disponibles para todos los terapeutas
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate(ROUTES.ADMIN_TEMPLATE_CREATE)}
            className="w-full sm:w-auto"
          >
            + Crear Plantilla
          </Button>
        </div>

        {loading ? (
          <Card>
            <p className="text-sage-600">Cargando plantillas...</p>
          </Card>
        ) : templates.length === 0 ? (
          <Card elevated>
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-sage-900 mb-2">
                No hay plantillas del sistema
              </h3>
              <p className="text-sage-600 mb-6">
                Crea la primera plantilla para compartir con todos los terapeutas
              </p>
              <Button
                variant="primary"
                onClick={() => navigate(ROUTES.ADMIN_TEMPLATE_CREATE)}
              >
                Crear Primera Plantilla
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
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
                    <div className="flex flex-wrap gap-3 text-sm text-sage-600">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">📝</span>
                        {template.questions.length} pregunta{template.questions.length !== 1 ? 's' : ''}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">📅</span>
                        {formatDate(template.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6 pt-6 border-t border-sage-200">
                    <Button
                      variant="secondary"
                      onClick={() => navigate(ROUTES.ADMIN_TEMPLATE_EDIT.replace(':templateId', template.id))}
                      className="flex-1 text-sm"
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
