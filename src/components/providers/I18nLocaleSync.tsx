'use client';
import { useEffect } from 'react';
import { i18next, changeLanguage } from '@/i18n/client';
import { locales, type Locale } from '@/i18n/config';

const STORAGE_KEY = 'ontooff_locale';

/**
 * Reads the saved locale from localStorage after hydration and applies it.
 * This avoids SSR/hydration mismatch — the server always renders with the
 * default locale, then the client switches after the first paint.
 */
export default function I18nLocaleSync() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && (locales as readonly string[]).includes(saved) && saved !== i18next.language) {
        changeLanguage(saved);
      }
    } catch {
      // localStorage not available (e.g. private browsing restrictions)
    }
  }, []);

  return null;
}
