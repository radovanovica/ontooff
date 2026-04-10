import type { InitOptions } from 'i18next';

export const defaultLocale = 'en' as const;
export const locales = ['en', 'sr'] as const;
export type Locale = (typeof locales)[number];

export const i18nConfig: InitOptions = {
  supportedLngs: locales,
  fallbackLng: defaultLocale,
  defaultNS: 'common',
  ns: ['common', 'auth', 'registration', 'admin', 'owner', 'validation'],
  interpolation: { escapeValue: false },
};
