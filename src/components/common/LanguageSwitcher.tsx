import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'es-MX', label: 'Español', flag: '🇲🇽' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
  ];

  const changeLanguage = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <div className="flex items-center gap-2">
      {languages.map((language) => (
        <button
          key={language.code}
          onClick={() => changeLanguage(language.code)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
            transition-all duration-200
            ${
              i18n.language === language.code
                ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-500'
                : 'bg-sage-100 text-sage-700 hover:bg-sage-200'
            }
          `}
          title={`Switch to ${language.label}`}
        >
          <span className="text-lg">{language.flag}</span>
          <span className="hidden sm:inline">{language.label}</span>
        </button>
      ))}
    </div>
  );
}
