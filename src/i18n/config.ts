import type { InitOptions } from 'i18next';

export const defaultLocale = 'en' as const;
export const locales = ['en', 'sr', 'hr', 'bs', 'cnr', 'de', 'es'] as const;
export type Locale = (typeof locales)[number];

export const i18nConfig: InitOptions = {
  supportedLngs: locales,
  fallbackLng: defaultLocale,
  defaultNS: 'common',
  ns: ['common', 'auth', 'registration', 'admin', 'owner', 'validation', 'blog'],
  interpolation: { escapeValue: false },
};

/**
 * Browser language prefix → app locale.
 * Add new entries here when a new language is added (e.g. 'fr': 'fr').
 */
export const browserLangToLocale: Partial<Record<string, Locale>> = {
  sr: 'sr',   // Serbian
  hr: 'hr',   // Croatian
  bs: 'bs',   // Bosnian
  cnr: 'cnr', // Montenegrin
  mk: 'sr',   // Macedonian → sr (closest available)
  de: 'de',   // German
  es: 'es',   // Spanish
  // Future languages:
  // fr: 'fr',
  // it: 'it',
  // hu: 'hu',
};

/**
 * ISO 3166-1 alpha-2 country code → app locale.
 * Used by server-side geo detection via Accept-Language / IP geo headers.
 * Add new entries here when a new language is added.
 */
export const geoCountryToLocale: Partial<Record<string, Locale>> = {
  RS: 'sr',   // Serbia
  HR: 'hr',   // Croatia
  BA: 'bs',   // Bosnia & Herzegovina
  ME: 'cnr',  // Montenegro
  MK: 'sr',   // North Macedonia → sr (no Macedonian locale yet)
  SI: 'sr',   // Slovenia → sr (no Slovenian locale yet)
  XK: 'sr',   // Kosovo
  DE: 'de',   // Germany
  AT: 'de',   // Austria
  CH: 'de',   // Switzerland (primary German)
  ES: 'es',   // Spain
  MX: 'es',   // Mexico
  AR: 'es',   // Argentina
  CO: 'es',   // Colombia
  CL: 'es',   // Chile
  PE: 'es',   // Peru
  VE: 'es',   // Venezuela
  EC: 'es',   // Ecuador
  GT: 'es',   // Guatemala
  CU: 'es',   // Cuba
  BO: 'es',   // Bolivia
  DO: 'es',   // Dominican Republic
  HN: 'es',   // Honduras
  PY: 'es',   // Paraguay
  SV: 'es',   // El Salvador
  NI: 'es',   // Nicaragua
  CR: 'es',   // Costa Rica
  PA: 'es',   // Panama
  UY: 'es',   // Uruguay
  // Future languages:
  // FR: 'fr',
  // IT: 'it',
  // HU: 'hu',
};

/** Resolve a locale string to a supported Locale, falling back to default. */
export function resolveLocale(value: string | null | undefined): Locale {
  if (!value) return defaultLocale;
  if ((locales as readonly string[]).includes(value)) return value as Locale;
  return defaultLocale;
}
