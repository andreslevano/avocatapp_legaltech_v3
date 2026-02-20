'use client';

import { useState } from 'react';
import { useI18n } from '@/hooks/useI18n';

type Locale = 'es' | 'nl' | 'en-GB' | 'it' | 'pt-BR';

const locales = [
  { code: 'es' as Locale, name: 'Español', flag: '🇪🇸' },
  { code: 'nl' as Locale, name: 'Nederlands', flag: '🇳🇱' },
  { code: 'en-GB' as Locale, name: 'English (UK)', flag: '🇬🇧' },
  { code: 'it' as Locale, name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt-BR' as Locale, name: 'Português (BR)', flag: '🇧🇷' },
];

export default function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { locale, changeLanguage } = useI18n();

  const handleLocaleChange = (newLocale: Locale) => {
    changeLanguage(newLocale);
    setIsOpen(false);
  };

  const currentLang = locales.find((lang) => lang.code === locale);

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          className="inline-flex justify-center w-full rounded-md border border-border shadow-sm px-4 py-2 bg-card/10 text-small font-medium text-text-on-dark hover:bg-hover/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sidebar focus:ring-border"
          id="menu-button"
          aria-expanded="true"
          aria-haspopup="true"
          onClick={() => setIsOpen(!isOpen)}
        >
          {currentLang?.flag} {currentLang?.name}
          <svg
            className="-mr-1 ml-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-card border border-border focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
          tabIndex={-1}
        >
          <div className="py-1" role="none">
            {locales.map((localeOption) => (
              <button
                key={localeOption.code}
                onClick={() => handleLocaleChange(localeOption.code)}
                className={`text-text-primary block px-4 py-2 text-small hover:bg-hover/30 w-full text-left ${
                  locale === localeOption.code ? 'bg-surface-muted/30 font-medium' : ''
                }`}
                role="menuitem"
                tabIndex={-1}
                id={`menu-item-${localeOption.code}`}
              >
                {localeOption.flag} {localeOption.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}