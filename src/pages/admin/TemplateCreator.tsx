import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { DashboardLayout } from '../../components/layout';
import { Card, Button, Input } from '../../components/common';
import type { Question, QuestionType, QuestionOption } from '../../types/test.types';
import { ROUTES } from '../../config/constants';

const CATEGORIES = [
  'Depresión',
  'Ansiedad',
  'Estrés',
  'Trauma',
  'Personalidad',
  'General',
  'Otro',
];

export function TemplateCreator() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const isEditMode = !!templateId;

  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testInstructions, setTestInstructions] = useState('');
  const [category, setCategory] = useState('General');
  const [questions, setQuestions] = useState<Question[]>([]);

  const [saving, setSaving] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(isEditMode);
  const [error, setError] = useState('');

  // Load existing template data in edit mode
  useEffect(() => {
    if (isEditMode && templateId) {
      loadTemplate(templateId);
    }
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'test_definitions', id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTestTitle(data.title || '');
        setTestDescription(data.description || '');
        setTestInstructions(data.instructions || '');
        setCategory(data.category || 'General');
        setQuestions(data.questions || []);
      } else {
        setError('Plantilla no encontrada');
      }
    } catch (err: any) {
      console.error('Error loading template:', err);
      setError('Error al cargar la plantilla');
    } finally {
      setLoadingTemplate(false);
    }
  };

  // Current question being edited
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  const addQuestion = (question: Question) => {
    if (editingQuestion) {
      setQuestions(questions.map(q => q.id === question.id ? question : q));
    } else {
      setQuestions([...questions, question]);
    }
    setEditingQuestion(null);
    setShowQuestionForm(false);
  };

  const deleteQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const handleSaveTest = async () => {
    if (!testTitle.trim()) {
      setError('El título del test es requerido');
      return;
    }

    if (questions.length === 0) {
      setError('Debes agregar al menos una pregunta');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (isEditMode && templateId) {
        // Update existing template
        await updateDoc(doc(db, 'test_definitions', templateId), {
          title: testTitle,
          description: testDescription,
          instructions: testInstructions || null,
          questions,
          category,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Create new template
        await addDoc(collection(db, 'test_definitions'), {
          title: testTitle,
          description: testDescription,
          instructions: testInstructions || null,
          createdBy: currentUser!.uid,
          tenantId: null,
          questions,
          isActive: true,
          isSystemTemplate: true,
          category,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      navigate(ROUTES.ADMIN_TEST_TEMPLATES);
    } catch (err: any) {
      console.error('Error saving template:', err);
      setError(err.message || 'Error al guardar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-sage-900 mb-2">
            {isEditMode ? 'Editar Plantilla del Sistema' : 'Crear Plantilla del Sistema'}
          </h1>
          <p className="text-sm sm:text-base text-sage-600">
            {isEditMode
              ? 'Modifica la plantilla de test del sistema'
              : 'Crea una plantilla de test que estará disponible para todos los terapeutas'}
          </p>
        </div>

        {error && (
          <div className="bg-coral-50 border border-coral-200 text-coral-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {loadingTemplate ? (
          <Card>
            <p className="text-sage-600">Cargando plantilla...</p>
          </Card>
        ) : (
        <div className="space-y-6">
          {/* Test Details */}
          <Card elevated>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-lg font-semibold">
                Plantilla del Sistema
              </span>
            </div>

            <h2 className="text-2xl font-semibold text-sage-900 mb-6">
              Información de la Plantilla
            </h2>

            <div className="space-y-4">
              <Input
                label="Título de la Plantilla"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                required
                placeholder="ej. Inventario de Depresión de Beck"
              />

              <div>
                <label className="label mb-2 block">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-field"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label mb-2 block">Descripción</label>
                <textarea
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Describe brevemente el propósito de la plantilla..."
                />
              </div>

              <div>
                <label className="label mb-2 block">Instrucciones (opcional)</label>
                <textarea
                  value={testInstructions}
                  onChange={(e) => setTestInstructions(e.target.value)}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Instrucciones para el paciente sobre cómo completar el test..."
                />
              </div>
            </div>
          </Card>

          {/* Questions List */}
          <Card elevated>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-sage-900">
                Preguntas ({questions.length})
              </h2>
              <Button
                variant="primary"
                onClick={() => {
                  setEditingQuestion(null);
                  setShowQuestionForm(true);
                }}
              >
                + Agregar Pregunta
              </Button>
            </div>

            {questions.length === 0 ? (
              <p className="text-sage-600 text-center py-8">
                No hay preguntas. Haz clic en "Agregar Pregunta" para comenzar.
              </p>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    index={index}
                    onEdit={() => {
                      setEditingQuestion(question);
                      setShowQuestionForm(true);
                    }}
                    onDelete={() => deleteQuestion(question.id)}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(ROUTES.ADMIN_TEST_TEMPLATES)}
              className="order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveTest}
              isLoading={saving}
              disabled={saving || questions.length === 0}
              className="flex-1 order-1 sm:order-2"
            >
              {saving ? 'Guardando...' : isEditMode ? 'Actualizar Plantilla' : 'Guardar Plantilla'}
            </Button>
          </div>
        </div>
        )}

        {/* Question Form Modal */}
        {showQuestionForm && (
          <QuestionFormModal
            question={editingQuestion}
            onSave={addQuestion}
            onCancel={() => {
              setEditingQuestion(null);
              setShowQuestionForm(false);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// Question Card Component
interface QuestionCardProps {
  question: Question;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

function QuestionCard({ question, index, onEdit, onDelete }: QuestionCardProps) {
  const getTypeLabel = (type: QuestionType) => {
    const labels = {
      MULTIPLE_CHOICE: 'Opción Múltiple',
      TEXT: 'Texto Libre',
      SCALE: 'Escala',
      YES_NO: 'Sí/No',
    };
    return labels[type];
  };

  return (
    <div className="p-4 border border-sage-200 rounded-xl hover:border-teal-300 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-semibold text-sage-600">
              Pregunta {index + 1}
            </span>
            <span className="text-xs px-2 py-1 bg-teal-100 text-teal-800 rounded-lg">
              {getTypeLabel(question.type)}
            </span>
            {question.required && (
              <span className="text-xs px-2 py-1 bg-coral-100 text-coral-800 rounded-lg">
                Obligatoria
              </span>
            )}
          </div>

          <p className="text-sage-900 font-medium mb-2">{question.text}</p>

          {question.type === 'MULTIPLE_CHOICE' && question.options && (
            <ul className="list-disc list-inside text-sm text-sage-600 ml-2">
              {question.options.map((opt) => (
                <li key={opt.id}>{opt.text}</li>
              ))}
            </ul>
          )}

          {question.type === 'SCALE' && (
            <p className="text-sm text-sage-600">
              Escala: {question.scaleMin || 1} a {question.scaleMax || 10}
              {question.scaleMinLabel && ` (${question.scaleMinLabel} - ${question.scaleMaxLabel})`}
            </p>
          )}
        </div>

        <div className="flex gap-2 ml-4">
          <Button variant="ghost" onClick={onEdit} className="text-sm">
            ✏️ Editar
          </Button>
          <Button
            variant="ghost"
            onClick={onDelete}
            className="text-sm text-coral-600 hover:bg-coral-50"
          >
            🗑️ Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}

// Question Form Modal Component
interface QuestionFormModalProps {
  question: Question | null;
  onSave: (question: Question) => void;
  onCancel: () => void;
}

function QuestionFormModal({ question, onSave, onCancel }: QuestionFormModalProps) {
  const [questionType, setQuestionType] = useState<QuestionType>(question?.type || 'TEXT');
  const [questionText, setQuestionText] = useState(question?.text || '');
  const [required, setRequired] = useState(question?.required ?? true);

  // For MULTIPLE_CHOICE
  const [options, setOptions] = useState<QuestionOption[]>(
    question?.options || [{ id: '1', text: '' }]
  );

  // For SCALE
  const [scaleMin, setScaleMin] = useState(question?.scaleMin || 1);
  const [scaleMax, setScaleMax] = useState(question?.scaleMax || 10);
  const [scaleMinLabel, setScaleMinLabel] = useState(question?.scaleMinLabel || '');
  const [scaleMaxLabel, setScaleMaxLabel] = useState(question?.scaleMaxLabel || '');

  const handleSave = () => {
    if (!questionText.trim()) {
      alert('El texto de la pregunta es requerido');
      return;
    }

    if (questionType === 'MULTIPLE_CHOICE' && options.filter(o => o.text.trim()).length < 2) {
      alert('Debes agregar al menos 2 opciones');
      return;
    }

    const newQuestion: Question = {
      id: question?.id || `q_${Date.now()}`,
      type: questionType,
      text: questionText,
      required,
      ...(questionType === 'MULTIPLE_CHOICE' && {
        options: options.filter(o => o.text.trim()),
      }),
      ...(questionType === 'SCALE' && {
        scaleMin,
        scaleMax,
        scaleMinLabel: scaleMinLabel || undefined,
        scaleMaxLabel: scaleMaxLabel || undefined,
      }),
    };

    onSave(newQuestion);
  };

  const addOption = () => {
    setOptions([...options, { id: `${options.length + 1}`, text: '' }]);
  };

  const updateOption = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index].text = text;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white sm:rounded-2xl shadow-lg max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <h3 className="text-2xl font-semibold text-sage-900 mb-6">
          {question ? 'Editar Pregunta' : 'Nueva Pregunta'}
        </h3>

        <div className="space-y-4">
          {/* Question Type */}
          <div>
            <label className="label mb-2 block">Tipo de Pregunta</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as QuestionType)}
              className="input-field"
            >
              <option value="TEXT">Texto Libre</option>
              <option value="MULTIPLE_CHOICE">Opción Múltiple</option>
              <option value="SCALE">Escala</option>
              <option value="YES_NO">Sí/No</option>
            </select>
          </div>

          {/* Question Text */}
          <div>
            <label className="label mb-2 block">Texto de la Pregunta</label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              className="input-field resize-none"
              placeholder="Escribe la pregunta..."
            />
          </div>

          {/* Required Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="w-4 h-4 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sage-700">Pregunta obligatoria</span>
          </label>

          {/* Options for MULTIPLE_CHOICE */}
          {questionType === 'MULTIPLE_CHOICE' && (
            <div>
              <label className="label mb-2 block">Opciones</label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option.text}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Opción ${index + 1}`}
                    />
                    {options.length > 1 && (
                      <Button
                        variant="ghost"
                        onClick={() => removeOption(index)}
                        className="text-coral-600"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="secondary" onClick={addOption} className="text-sm">
                  + Agregar Opción
                </Button>
              </div>
            </div>
          )}

          {/* Scale Settings */}
          {questionType === 'SCALE' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Valor Mínimo"
                  value={scaleMin}
                  onChange={(e) => setScaleMin(Number(e.target.value))}
                  min={0}
                />
                <Input
                  type="number"
                  label="Valor Máximo"
                  value={scaleMax}
                  onChange={(e) => setScaleMax(Number(e.target.value))}
                  min={scaleMin + 1}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Etiqueta Mínima (opcional)"
                  value={scaleMinLabel}
                  onChange={(e) => setScaleMinLabel(e.target.value)}
                  placeholder="ej. Nada"
                />
                <Input
                  label="Etiqueta Máxima (opcional)"
                  value={scaleMaxLabel}
                  onChange={(e) => setScaleMaxLabel(e.target.value)}
                  placeholder="ej. Extremadamente"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6 pt-6 border-t border-sage-200">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} className="flex-1">
            {question ? 'Actualizar Pregunta' : 'Agregar Pregunta'}
          </Button>
        </div>
      </div>
    </div>
  );
}
