import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import esTranslation from '../locales/es-MX/translation.json';
import enTranslation from '../locales/en/translation.json';

const resources = {
  'es-MX': {
    translation: esTranslation,
  },
  en: {
    translation: enTranslation,
  },
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n to react-i18next
  .init({
    resources,
    fallbackLng: 'es-MX', // Spanish (Mexico) as default
    lng: 'es-MX', // Force Spanish (Mexico) as initial language
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
