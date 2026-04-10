'use client';
import i18next from 'i18next';
import { initReactI18next, useTranslation as useTranslationOrg } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { i18nConfig, defaultLocale, type Locale } from './config';

// Client-side singleton
const runsOnServerSide = typeof window === 'undefined';

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
    lng: defaultLocale,
    preload: runsOnServerSide ? ['en', 'sr'] : [],
  });

export function useTranslation(ns: string = 'common', options?: { keyPrefix?: string }) {
  return useTranslationOrg(ns, options);
}

export function useLocale(): Locale {
  return (i18next.language ?? defaultLocale) as Locale;
}

export function changeLanguage(locale: Locale) {
  return i18next.changeLanguage(locale);
}

export { i18next };
