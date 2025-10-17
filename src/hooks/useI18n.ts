import { useI18n as useI18nContext } from '@/contexts/I18nContext';

export function useI18n() {
  const { locale, setLocale, t } = useI18nContext();
  
  return {
    locale,
    translations: {},
    t,
    changeLanguage: setLocale
  };
}
