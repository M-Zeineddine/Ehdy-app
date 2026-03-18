import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import ar from './locales/ar.json';

i18next.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  lng: Localization.getLocales?.()?.[0]?.languageCode ?? 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  interpolation: { escapeValue: false },
});

/**
 * Translate a dot-notation key, e.g. i18n('auth.login.title')
 * Supports i18next interpolation: i18n('gifts.to', { name: 'Sara' })
 */
export function i18n(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, options as any) as string;
}

export default i18next;
