import { useState } from 'react';
import { SPECIALIZATIONS } from '../../config/specializations';

interface SpecializationSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
  label?: string;
  helperText?: string;
}

export function SpecializationSelector({
  value,
  onChange,
  required = false,
  label = 'Especialización',
  helperText = 'Selecciona una o más especializaciones',
}: SpecializationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSpecialization = (spec: string) => {
    if (value.includes(spec)) {
      onChange(value.filter(s => s !== spec));
    } else {
      onChange([...value, spec]);
    }
  };

  const removeSpecialization = (spec: string) => {
    onChange(value.filter(s => s !== spec));
  };

  return (
    <div className="space-y-2">
      <label className="label">
        {label} {required && <span className="text-coral-600">*</span>}
      </label>

      {/* Selected specializations */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((spec) => (
            <span
              key={spec}
              className="inline-flex items-center gap-2 px-3 py-1 bg-teal-100 text-teal-800 rounded-lg text-sm border border-teal-200"
            >
              {spec}
              <button
                type="button"
                onClick={() => removeSpecialization(spec)}
                className="text-teal-600 hover:text-teal-800 font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="input-field w-full text-left flex items-center justify-between"
        >
          <span className="text-sage-600">
            {value.length === 0
              ? 'Seleccionar especializaciones...'
              : `${value.length} seleccionada${value.length > 1 ? 's' : ''}`}
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown menu */}
            <div className="absolute z-20 w-full mt-2 bg-white border border-sage-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {SPECIALIZATIONS.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => toggleSpecialization(spec)}
                  className={`w-full text-left px-4 py-3 hover:bg-sage-50 transition-colors flex items-center justify-between ${
                    value.includes(spec) ? 'bg-teal-50' : ''
                  }`}
                >
                  <span className="text-sage-900">{spec}</span>
                  {value.includes(spec) && (
                    <svg
                      className="w-5 h-5 text-teal-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {helperText && (
        <p className="text-sm text-sage-600">{helperText}</p>
      )}
    </div>
  );
}
