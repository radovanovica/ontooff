import { NextRequest, NextResponse } from 'next/server';

// Maps our app locale codes to ISO 639-1 codes that MyMemory understands
const LOCALE_TO_LANG: Record<string, string> = {
  en: 'en',
  sr: 'sr',
  hr: 'hr',
  bs: 'bs',
  cnr: 'sr', // Montenegrin — MyMemory treats as Serbian (closest)
  de: 'de',
  es: 'es',
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { text, targetLocale } = body as { text?: unknown; targetLocale?: unknown };

  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: 'text too long (max 2000 chars)' }, { status: 400 });
  }

  const targetLang = LOCALE_TO_LANG[String(targetLocale ?? 'en')] ?? 'en';

  try {
    const url =
      `https://api.mymemory.translated.net/get` +
      `?q=${encodeURIComponent(text)}` +
      `&langpair=autodetect|${targetLang}`;

    const res = await fetch(url, {
      next: { revalidate: 3600 }, // cache translations for 1 hour
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Translation service error' }, { status: 502 });
    }

    const data = await res.json();
    const translated: string | undefined = data?.responseData?.translatedText;

    if (!translated) {
      return NextResponse.json({ error: 'No translation returned' }, { status: 502 });
    }

    // MyMemory echoes the original text when it cannot translate — treat that as an error
    if (translated.trim().toLowerCase() === text.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Text is already in target language' }, { status: 204 });
    }

    return NextResponse.json({ translated });
  } catch {
    return NextResponse.json({ error: 'Translation failed' }, { status: 502 });
  }
}
