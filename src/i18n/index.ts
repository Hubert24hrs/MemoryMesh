/* eslint-disable import/no-named-as-default-member -- i18next's default export is the configured instance */
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';

// Add a locale by dropping `<code>.json` next to en.json and listing it here.
const resources = { en: { translation: en } };

export const deviceLocale = getLocales()[0]?.languageTag ?? 'en';

void i18n.use(initReactI18next).init({
  resources,
  lng: getLocales()[0]?.languageCode ?? 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/** Read a string-array resource (e.g. example prompts). */
export function tList(key: string): string[] {
  const value = i18n.t(key, { returnObjects: true }) as unknown;
  return Array.isArray(value) ? (value as string[]) : [];
}

export default i18n;
