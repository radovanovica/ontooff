import { NextResponse } from 'next/server';

// Revalidate every 6 hours — ECB rates update once a day
export const revalidate = 21600;

// Fallback rates (EUR base) in case the external API is unreachable
const FALLBACK_RATES: Record<string, number> = {
  EUR: 1,
  USD: 1.10,
  CHF: 0.96,
  RSD: 117.0,
};

export async function GET() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR', {
      next: { revalidate: 21600 },
    });

    if (!res.ok) throw new Error(`Frankfurter returned ${res.status}`);

    const data = (await res.json()) as { rates: Record<string, number> };
    const rates: Record<string, number> = { EUR: 1, ...data.rates };

    return NextResponse.json(
      { rates },
      { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600' } }
    );
  } catch (err) {
    console.warn('[exchange-rates] Using fallback rates:', err);
    return NextResponse.json(
      { rates: FALLBACK_RATES },
      { headers: { 'Cache-Control': 'public, s-maxage=3600' } }
    );
  }
}
