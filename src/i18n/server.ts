import { createInstance } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next/initReactI18next';
import { cookies } from 'next/headers';
import { i18nConfig, defaultLocale, locales, type Locale } from './config';

async function initI18next(locale: Locale, ns: string | string[]) {
  const i18nInstance = createInstance();
  await i18nInstance
    .use(initReactI18next)
    .use(
      resourcesToBackend(
        (language: string, namespace: string) =>
          import(`./locales/${language}/${namespace}.json`)
      )
    )
    .init({ ...i18nConfig, lng: locale, ns });
  return i18nInstance;
}

/**
 * Read the user's chosen locale from the `ontooff_locale` cookie set by
 * `changeLanguage()` on the client. Falls back to defaultLocale ('en').
 */
export async function getServerLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get('ontooff_locale')?.value as Locale | undefined;
    if (value && (locales as readonly string[]).includes(value)) return value;
  } catch {
    // cookies() unavailable during static generation
  }
  return defaultLocale;
}

export async function getTranslation(locale: Locale, ns: string | string[] = 'common') {
  const i18nextInstance = await initI18next(locale, ns);
  return {
    t: i18nextInstance.getFixedT(locale, Array.isArray(ns) ? ns[0] : ns),
    i18n: i18nextInstance,
  };
}
