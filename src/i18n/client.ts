'use client';
import i18next from 'i18next';
import { initReactI18next, useTranslation as useTranslationOrg } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { i18nConfig, defaultLocale, locales, type Locale } from './config';

const STORAGE_KEY = 'ontooff_locale';

// Client-side singleton
const runsOnServerSide = typeof window === 'undefined';

function getSavedLocale(): Locale {
  if (runsOnServerSide) return defaultLocale;
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && (locales as readonly string[]).includes(saved)) return saved;
  } catch {
    // localStorage not available
  }
  return defaultLocale;
}

i18next
  .use(initReactI18next)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`./locales/${language}/${namespace}.json`)
    )
  )
  .init({
    ...i18nConfig,
    lng: defaultLocale, // Always start with default to prevent SSR/client hydration mismatch
    preload: runsOnServerSide ? ['en', 'sr'] : [],
  });

export function useTranslation(ns: string = 'common', options?: { keyPrefix?: string }) {
  return useTranslationOrg(ns, options);
}

export function useLocale(): Locale {
  return (i18next.language ?? defaultLocale) as Locale;
}

export function changeLanguage(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // localStorage not available
  }
  return i18next.changeLanguage(locale);
}

export { i18next };
