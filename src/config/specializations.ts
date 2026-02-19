// Common mental health specializations in Mexico
export const SPECIALIZATIONS = [
  'Psicología Clínica',
  'Terapia Cognitivo-Conductual',
  'Psicoanálisis',
  'Terapia Familiar y de Pareja',
  'Psicología Infantil y Adolescente',
  'Neuropsicología',
  'Psicología Educativa',
  'Psicología Laboral y Organizacional',
  'Terapia Gestalt',
  'Terapia Humanista',
  'Terapia Sistémica',
  'Psicología de la Salud',
  'Psicología Forense',
  'Adicciones',
  'Trastornos de la Conducta Alimentaria',
  'Trauma y EMDR',
  'Psicoterapia Breve',
  'Sexología Clínica',
  'Tanatología',
  'Psiquiatría',
] as const;

export type Specialization = typeof SPECIALIZATIONS[number];
