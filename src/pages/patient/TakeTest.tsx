import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { DashboardLayout } from '../../components/layout';
import { Card, Button } from '../../components/common';
import type { TestAssignment, Question, TestResponse } from '../../types/test.types';

export function TakeTest() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<TestAssignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (assignmentId && currentUser) {
      fetchAssignment();
    }
  }, [assignmentId, currentUser]);

  const fetchAssignment = async () => {
    if (!assignmentId) return;

    try {
      const assignmentDoc = await getDoc(doc(db, 'test_assignments', assignmentId));
      if (assignmentDoc.exists()) {
        const assignmentData = { id: assignmentDoc.id, ...assignmentDoc.data() } as TestAssignment;
        setAssignment(assignmentData);

        // Fetch test definition to get questions
        const testDoc = await getDoc(doc(db, 'test_definitions', assignmentData.testId));
        if (testDoc.exists()) {
          const testData = testDoc.data();
          setQuestions(testData.questions || []);

          // Load existing answers if in progress
          if (assignmentData.responses && assignmentData.responses.length > 0) {
            const existingAnswers: Record<string, any> = {};
            assignmentData.responses.forEach(response => {
              existingAnswers[response.questionId] = response.answer;
            });
            setAnswers(existingAnswers);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching assignment:', err);
      setError('Error al cargar la evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers({
      ...answers,
      [questionId]: answer,
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const buildResponses = (): TestResponse[] => {
    return Object.entries(answers).map(([questionId, answer]) => {
      const question = questions.find(q => q.id === questionId);
      const response: TestResponse = {
        questionId,
        questionText: question?.text || '',
        questionType: question?.type || 'TEXT',
        answer,
        answeredAt: Timestamp.now(),
      };
      // Store human-readable answer text for MULTIPLE_CHOICE
      if (question?.type === 'MULTIPLE_CHOICE' && question.options) {
        const selectedOption = question.options.find(o => o.id === answer);
        if (selectedOption) {
          response.answerText = selectedOption.text;
        }
      }
      return response;
    });
  };

  const handleSaveProgress = async () => {
    if (!assignment || !assignmentId) return;

    setSubmitting(true);
    try {
      const responses = buildResponses();

      await updateDoc(doc(db, 'test_assignments', assignmentId), {
        status: 'IN_PROGRESS',
        startedAt: assignment.startedAt || Timestamp.now(),
        responses,
      });

      navigate('/patient/tests');
    } catch (err: any) {
      console.error('Error saving progress:', err);
      setError('Error al guardar el progreso');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!assignment || !assignmentId) return;

    // Check required questions
    const unansweredRequired = questions.filter(
      q => q.required && !answers[q.id]
    );

    if (unansweredRequired.length > 0) {
      setError(`Debes responder todas las preguntas obligatorias (${unansweredRequired.length} pendientes)`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const responses = buildResponses();

      await updateDoc(doc(db, 'test_assignments', assignmentId), {
        status: 'COMPLETED',
        completedAt: Timestamp.now(),
        startedAt: assignment.startedAt || Timestamp.now(),
        responses,
      });

      navigate('/patient/tests');
    } catch (err: any) {
      console.error('Error submitting test:', err);
      setError('Error al enviar la evaluación');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-4xl mx-auto">
          <p className="text-sage-600">Cargando evaluación...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!assignment || questions.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-4xl mx-auto">
          <Card>
            <p className="text-coral-600">Evaluación no encontrada</p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-sage-900 mb-2">
            {assignment.testTitle}
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-sage-600">
            <span>Pregunta {currentQuestionIndex + 1} de {questions.length}</span>
            <span className="hidden sm:inline">•</span>
            <span>{answeredCount} de {questions.length} respondidas</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 bg-sage-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="bg-coral-50 border border-coral-200 text-coral-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Question Card */}
        <Card elevated>
          <div className="mb-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-sm font-semibold text-sage-600 mt-1">
                {currentQuestionIndex + 1}.
              </span>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-sage-900">
                  {currentQuestion.text}
                  {currentQuestion.required && (
                    <span className="text-coral-600 ml-1">*</span>
                  )}
                </h2>
              </div>
            </div>

            {/* Question Input based on type */}
            <QuestionInput
              question={currentQuestion}
              value={answers[currentQuestion.id]}
              onChange={(value) => handleAnswer(currentQuestion.id, value)}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-6 border-t border-sage-200">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="order-2 sm:order-1"
            >
              ← Anterior
            </Button>

            <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
              <Button
                variant="secondary"
                onClick={handleSaveProgress}
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                Guardar Progreso
              </Button>

              {currentQuestionIndex < questions.length - 1 ? (
                <Button variant="primary" onClick={handleNext} className="w-full sm:w-auto">
                  Siguiente →
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  isLoading={submitting}
                  className="w-full sm:w-auto"
                >
                  {submitting ? 'Enviando...' : 'Enviar Evaluación'}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// Question Input Component
interface QuestionInputProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
}

function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  switch (question.type) {
    case 'TEXT':
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="input-field resize-none w-full"
          placeholder="Escribe tu respuesta aquí..."
        />
      );

    case 'MULTIPLE_CHOICE':
      return (
        <div className="space-y-3">
          {question.options?.map((option) => (
            <label
              key={option.id}
              className="flex items-start gap-3 p-4 border-2 border-sage-200 rounded-xl hover:border-teal-400 cursor-pointer transition-all min-h-[60px]"
            >
              <input
                type="radio"
                name={question.id}
                value={option.id}
                checked={value === option.id}
                onChange={(e) => onChange(e.target.value)}
                className="w-5 h-5 text-teal-600 focus:ring-teal-500 mt-0.5 flex-shrink-0"
              />
              <span className="text-sage-900 text-base leading-relaxed">{option.text}</span>
            </label>
          ))}
        </div>
      );

    case 'SCALE':
      const min = question.scaleMin || 1;
      const max = question.scaleMax || 10;
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            {question.scaleMinLabel && (
              <span className="text-sm text-sage-600">{question.scaleMinLabel}</span>
            )}
            <span className="text-lg font-bold text-teal-600">
              {value || '-'}
            </span>
            {question.scaleMaxLabel && (
              <span className="text-sm text-sage-600">{question.scaleMaxLabel}</span>
            )}
          </div>
          <input
            type="range"
            min={min}
            max={max}
            value={value || min}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 bg-sage-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
          />
          <div className="flex justify-between text-xs text-sage-500">
            {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(num => (
              <span key={num}>{num}</span>
            ))}
          </div>
        </div>
      );

    case 'YES_NO':
      return (
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <label className="flex items-center gap-3 p-4 border-2 border-sage-200 rounded-xl hover:border-teal-400 cursor-pointer transition-all flex-1 min-h-[60px]">
            <input
              type="radio"
              name={question.id}
              value="true"
              checked={value === true}
              onChange={() => onChange(true)}
              className="w-5 h-5 text-teal-600 focus:ring-teal-500 flex-shrink-0"
            />
            <span className="text-sage-900 font-semibold text-lg">Sí</span>
          </label>
          <label className="flex items-center gap-3 p-4 border-2 border-sage-200 rounded-xl hover:border-teal-400 cursor-pointer transition-all flex-1 min-h-[60px]">
            <input
              type="radio"
              name={question.id}
              value="false"
              checked={value === false}
              onChange={() => onChange(false)}
              className="w-5 h-5 text-teal-600 focus:ring-teal-500 flex-shrink-0"
            />
            <span className="text-sage-900 font-semibold text-lg">No</span>
          </label>
        </div>
      );

    default:
      return null;
  }
}
