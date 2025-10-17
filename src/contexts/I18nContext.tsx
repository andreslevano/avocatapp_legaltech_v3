'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Locale = 'es' | 'nl' | 'en-GB' | 'it' | 'pt-BR';

interface Translations {
  [key: string]: any;
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Import translations directly
import esTranslations from '../../public/locales/es/common.json';
import nlTranslations from '../../public/locales/nl/common.json';
import enGBTranslations from '../../public/locales/en-GB/common.json';
import itTranslations from '../../public/locales/it/common.json';
import ptBRTranslations from '../../public/locales/pt-BR/common.json';

const translations: Record<Locale, Translations> = {
  es: esTranslations,
  nl: nlTranslations,
  'en-GB': enGBTranslations,
  it: itTranslations,
  'pt-BR': ptBRTranslations
};

const getNestedTranslation = (obj: Translations, path: string): string => {
  const parts = path.split('.');
  let current: any = obj;
  for (let i = 0; i < parts.length; i++) {
    if (current === undefined || current === null) {
      return path; // Return the key if any part of the path is missing
    }
    current = current[parts[i]];
  }
  return current !== undefined && current !== null ? String(current) : path;
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('language') as Locale;
      if (savedLocale && ['es', 'nl', 'en-GB', 'it', 'pt-BR'].includes(savedLocale)) {
        return savedLocale;
      }
    }
    return 'es';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', locale);
    }
  }, [locale]);

  const t = (key: string): string => {
    const currentTranslations = translations[locale];
    const translated = getNestedTranslation(currentTranslations, key);
    return translated;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
