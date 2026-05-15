'use client';
import { useEffect } from 'react';
import { i18next, changeLanguage } from '@/i18n/client';
import { locales, type Locale } from '@/i18n/config';

const STORAGE_KEY = 'ontooff_locale';

/**
 * Reads the saved locale from localStorage after hydration and applies it.
 *
 * On the very first visit (no saved locale) it calls /api/locale/detect which
 * uses the Accept-Language header and optional geo headers to pick the best
 * locale for the user. The result is then saved so subsequent visits are instant.
 *
 * Priority:
 *  1. Explicit user choice stored in localStorage  ← always wins
 *  2. Server-detected locale from Accept-Language / geo headers
 *  3. Default locale (en)
 */
export default function I18nLocaleSync() {
  useEffect(() => {
    async function syncLocale() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;

        if (saved && (locales as readonly string[]).includes(saved)) {
          // User has explicitly chosen a language — apply it and stop
          if (saved !== i18next.language) changeLanguage(saved);
          return;
        }

        // First visit: ask the server to detect locale from headers / geo
        const res = await fetch('/api/locale/detect', { cache: 'no-store' });
        if (!res.ok) return;

        const { locale } = (await res.json()) as { locale: Locale };
        if (locale && (locales as readonly string[]).includes(locale)) {
          changeLanguage(locale);
          // Save as the detected default so future visits are instant
          // (changeLanguage already saves to localStorage via i18n/client.ts)
        }
      } catch {
        // localStorage not available or fetch failed — silently ignore
      }
    }

    syncLocale();
  }, []);

  return null;
}

