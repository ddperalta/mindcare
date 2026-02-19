import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { DashboardLayout } from '../../components/layout';
import { Card, Button, Input } from '../../components/common';
import type { Question, QuestionType, QuestionOption } from '../../types/test.types';
import { ROUTES } from '../../config/constants';

export function TestEditor() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();

  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testInstructions, setTestInstructions] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);

  const [saving, setSaving] = useState(false);
  const [loadingTest, setLoadingTest] = useState(true);
  const [error, setError] = useState('');

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  useEffect(() => {
    if (testId) loadTest(testId);
  }, [testId]);

  const loadTest = async (id: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'test_definitions', id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Verify ownership
        if (data.createdBy !== currentUser?.uid) {
          setError('No tienes permiso para editar este test');
          return;
        }
        setTestTitle(data.title || '');
        setTestDescription(data.description || '');
        setTestInstructions(data.instructions || '');
        setQuestions(data.questions || []);
      } else {
        setError('Test no encontrado');
      }
    } catch (err: any) {
      console.error('Error loading test:', err);
      setError('Error al cargar el test');
    } finally {
      setLoadingTest(false);
    }
  };

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
    if (!testId) return;

    setSaving(true);
    setError('');

    try {
      await updateDoc(doc(db, 'test_definitions', testId), {
        title: testTitle,
        description: testDescription,
        instructions: testInstructions || null,
        questions,
        updatedAt: Timestamp.now(),
      });

      navigate(ROUTES.THERAPIST_TESTS);
    } catch (err: any) {
      console.error('Error saving test:', err);
      setError(err.message || 'Error al guardar el test');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-sage-900 mb-2">
            Editar Test
          </h1>
          <p className="text-sm sm:text-base text-sage-600">
            Modifica las preguntas y configuración de tu test
          </p>
        </div>

        {error && (
          <div className="bg-coral-50 border border-coral-200 text-coral-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {loadingTest ? (
          <Card>
            <p className="text-sage-600">Cargando test...</p>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card elevated>
              <h2 className="text-2xl font-semibold text-sage-900 mb-6">
                Información del Test
              </h2>
              <div className="space-y-4">
                <Input
                  label="Título del Test"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  required
                  placeholder="ej. Evaluación de Ansiedad"
                />
                <div>
                  <label className="label mb-2 block">Descripción</label>
                  <textarea
                    value={testDescription}
                    onChange={(e) => setTestDescription(e.target.value)}
                    rows={3}
                    className="input-field resize-none"
                    placeholder="Describe brevemente el propósito del test..."
                  />
                </div>
                <div>
                  <label className="label mb-2 block">Instrucciones (opcional)</label>
                  <textarea
                    value={testInstructions}
                    onChange={(e) => setTestInstructions(e.target.value)}
                    rows={3}
                    className="input-field resize-none"
                    placeholder="Instrucciones para el paciente..."
                  />
                </div>
              </div>
            </Card>

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

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate(ROUTES.THERAPIST_TESTS)}
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
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </div>
        )}

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

function QuestionCard({ question, index, onEdit, onDelete }: {
  question: Question; index: number; onEdit: () => void; onDelete: () => void;
}) {
  const getTypeLabel = (type: QuestionType) => {
    const labels = { MULTIPLE_CHOICE: 'Opción Múltiple', TEXT: 'Texto Libre', SCALE: 'Escala', YES_NO: 'Sí/No' };
    return labels[type];
  };

  return (
    <div className="p-4 border border-sage-200 rounded-xl hover:border-teal-300 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-semibold text-sage-600">Pregunta {index + 1}</span>
            <span className="text-xs px-2 py-1 bg-teal-100 text-teal-800 rounded-lg">{getTypeLabel(question.type)}</span>
            {question.required && (
              <span className="text-xs px-2 py-1 bg-coral-100 text-coral-800 rounded-lg">Obligatoria</span>
            )}
          </div>
          <p className="text-sage-900 font-medium mb-2">{question.text}</p>
          {question.type === 'MULTIPLE_CHOICE' && question.options && (
            <ul className="list-disc list-inside text-sm text-sage-600 ml-2">
              {question.options.map((opt) => (<li key={opt.id}>{opt.text}</li>))}
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
          <Button variant="ghost" onClick={onEdit} className="text-sm">Editar</Button>
          <Button variant="ghost" onClick={onDelete} className="text-sm text-coral-600 hover:bg-coral-50">Eliminar</Button>
        </div>
      </div>
    </div>
  );
}

function QuestionFormModal({ question, onSave, onCancel }: {
  question: Question | null; onSave: (q: Question) => void; onCancel: () => void;
}) {
  const [questionType, setQuestionType] = useState<QuestionType>(question?.type || 'TEXT');
  const [questionText, setQuestionText] = useState(question?.text || '');
  const [required, setRequired] = useState(question?.required ?? true);
  const [options, setOptions] = useState<QuestionOption[]>(question?.options || [{ id: '1', text: '' }]);
  const [scaleMin, setScaleMin] = useState(question?.scaleMin || 1);
  const [scaleMax, setScaleMax] = useState(question?.scaleMax || 10);
  const [scaleMinLabel, setScaleMinLabel] = useState(question?.scaleMinLabel || '');
  const [scaleMaxLabel, setScaleMaxLabel] = useState(question?.scaleMaxLabel || '');

  const handleSave = () => {
    if (!questionText.trim()) { alert('El texto de la pregunta es requerido'); return; }
    if (questionType === 'MULTIPLE_CHOICE' && options.filter(o => o.text.trim()).length < 2) {
      alert('Debes agregar al menos 2 opciones'); return;
    }
    onSave({
      id: question?.id || `q_${Date.now()}`,
      type: questionType, text: questionText, required,
      ...(questionType === 'MULTIPLE_CHOICE' && { options: options.filter(o => o.text.trim()) }),
      ...(questionType === 'SCALE' && { scaleMin, scaleMax, scaleMinLabel: scaleMinLabel || undefined, scaleMaxLabel: scaleMaxLabel || undefined }),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white sm:rounded-2xl shadow-lg max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <h3 className="text-2xl font-semibold text-sage-900 mb-6">
          {question ? 'Editar Pregunta' : 'Nueva Pregunta'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="label mb-2 block">Tipo de Pregunta</label>
            <select value={questionType} onChange={(e) => setQuestionType(e.target.value as QuestionType)} className="input-field">
              <option value="TEXT">Texto Libre</option>
              <option value="MULTIPLE_CHOICE">Opción Múltiple</option>
              <option value="SCALE">Escala</option>
              <option value="YES_NO">Sí/No</option>
            </select>
          </div>
          <div>
            <label className="label mb-2 block">Texto de la Pregunta</label>
            <textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={3} className="input-field resize-none" placeholder="Escribe la pregunta..." />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="w-4 h-4 text-teal-600 focus:ring-teal-500" />
            <span className="text-sage-700">Pregunta obligatoria</span>
          </label>
          {questionType === 'MULTIPLE_CHOICE' && (
            <div>
              <label className="label mb-2 block">Opciones</label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input value={option.text} onChange={(e) => { const n = [...options]; n[index].text = e.target.value; setOptions(n); }} placeholder={`Opción ${index + 1}`} />
                    {options.length > 1 && (<Button variant="ghost" onClick={() => setOptions(options.filter((_, i) => i !== index))} className="text-coral-600">x</Button>)}
                  </div>
                ))}
                <Button variant="secondary" onClick={() => setOptions([...options, { id: `${options.length + 1}`, text: '' }])} className="text-sm">+ Agregar Opción</Button>
              </div>
            </div>
          )}
          {questionType === 'SCALE' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <Input type="number" label="Valor Mínimo" value={scaleMin} onChange={(e) => setScaleMin(Number(e.target.value))} min={0} />
                <Input type="number" label="Valor Máximo" value={scaleMax} onChange={(e) => setScaleMax(Number(e.target.value))} min={scaleMin + 1} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Etiqueta Mínima (opcional)" value={scaleMinLabel} onChange={(e) => setScaleMinLabel(e.target.value)} placeholder="ej. Nada" />
                <Input label="Etiqueta Máxima (opcional)" value={scaleMaxLabel} onChange={(e) => setScaleMaxLabel(e.target.value)} placeholder="ej. Extremadamente" />
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-4 mt-6 pt-6 border-t border-sage-200">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} className="flex-1">{question ? 'Actualizar Pregunta' : 'Agregar Pregunta'}</Button>
        </div>
      </div>
    </div>
  );
}
