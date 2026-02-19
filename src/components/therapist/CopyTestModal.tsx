import { useState } from 'react';
import { Input, Button } from '../common';
import type { TestDefinition } from '../../types/test.types';

interface CopyTestModalProps {
  template: TestDefinition;
  onCopy: (customizedTitle: string) => Promise<void>;
  onCancel: () => void;
}

export function CopyTestModal({ template, onCopy, onCancel }: CopyTestModalProps) {
  const [title, setTitle] = useState(`${template.title} (Copia)`);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState('');

  const handleCopy = async () => {
    if (!title.trim()) {
      setError('El título es requerido');
      return;
    }

    setCopying(true);
    setError('');

    try {
      await onCopy(title);
    } catch (err: any) {
      setError(err.message || 'Error al copiar');
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6">
        <h3 className="text-2xl font-semibold text-sage-900 mb-4">
          Copiar Plantilla
        </h3>

        <div className="space-y-4">
          <div className="bg-sage-50 p-4 rounded-xl">
            <p className="text-sm text-sage-600 mb-2">
              Se copiará la plantilla <strong>"{template.title}"</strong> con todas sus preguntas.
            </p>
            <p className="text-sm text-sage-600">
              📊 {template.questions.length} pregunta{template.questions.length !== 1 ? 's' : ''} {template.questions.length !== 1 ? 'serán copiadas' : 'será copiada'}
            </p>
          </div>

          {error && (
            <div className="bg-coral-50 border border-coral-200 text-coral-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <Input
            label="Nombre del Test"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Nombre para tu copia"
          />

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={onCancel} disabled={copying}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCopy}
              isLoading={copying}
              className="flex-1"
            >
              {copying ? 'Copiando...' : 'Copiar Plantilla'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
