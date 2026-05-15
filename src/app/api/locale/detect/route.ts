import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, geoCountryToLocale, browserLangToLocale, resolveLocale, type Locale } from '@/i18n/config';

/**
 * GET /api/locale/detect
 *
 * Detects the best locale for the requesting user without any external API calls:
 * 1. Reads CF-IPCountry header (Cloudflare) or x-vercel-ip-country (Vercel) if available
 * 2. Falls back to parsing the Accept-Language header
 * 3. Falls back to defaultLocale
 *
 * Returns: { locale: 'en' | 'sr' | ... }
 *
 * To support a new language in the future:
 *   1. Add locale files under src/i18n/locales/<code>/
 *   2. Add the code to `locales` array in config.ts
 *   3. Add country/language mappings to geoCountryToLocale / browserLangToLocale in config.ts
 */
export async function GET(req: NextRequest) {
  const locale = detectLocale(req);
  return NextResponse.json({ locale }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

function detectLocale(req: NextRequest): Locale {
  // 1. Geo header (Cloudflare or Vercel edge)
  const geoCountry =
    req.headers.get('cf-ipcountry') ??
    req.headers.get('x-vercel-ip-country');

  if (geoCountry && geoCountry !== 'XX') {
    const fromGeo = geoCountryToLocale[geoCountry.toUpperCase()];
    if (fromGeo) return fromGeo;
    // Country is known but has no specific locale → fall through to Accept-Language
  }

  // 2. Accept-Language header
  const acceptLang = req.headers.get('accept-language');
  if (acceptLang) {
    // Example value: "sr-RS,sr;q=0.9,en-US;q=0.8,en;q=0.7"
    const preferred = parseAcceptLanguage(acceptLang);
    for (const lang of preferred) {
      const fromBrowser = browserLangToLocale[lang];
      if (fromBrowser) return fromBrowser;
      // Try as a full locale string (e.g. 'sr' is already in locales)
      const direct = resolveLocale(lang);
      if (direct !== defaultLocale) return direct;
    }
  }

  return defaultLocale;
}

/** Parse Accept-Language header into ordered language tag prefixes. */
function parseAcceptLanguage(header: string): string[] {
  return header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.trim().split('-')[0].toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q)
    .map((e) => e.tag)
    .filter(Boolean);
}
