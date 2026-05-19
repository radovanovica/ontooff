'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';

// ─── Supported currencies ────────────────────────────────────────────────────

export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'RSD', 'HRK', 'BAM'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_LABELS: Record<Currency, string> = {
  EUR: 'Euro (€)',
  USD: 'US Dollar ($)',
  GBP: 'British Pound (£)',
  CHF: 'Swiss Franc (CHF)',
  RSD: 'Serbian Dinar (RSD)',
  HRK: 'Croatian Kuna (HRK)',
  BAM: 'Bosnian Mark (BAM)',
};

// Fallback rates (EUR base) — used before the API responds
const FALLBACK_RATES: Record<string, number> = {
  EUR: 1,
  USD: 1.10,
  GBP: 0.86,
  CHF: 0.96,
  RSD: 117.0,
  HRK: 7.53,
  BAM: 1.955,
};

const STORAGE_KEY = 'ontooff_currency';

// ─── Context ─────────────────────────────────────────────────────────────────

interface CurrencyContextValue {
  currency: Currency;
  rates: Record<string, number>;
  ratesLoaded: boolean;
  setCurrency: (c: Currency) => void;
  /** Convert `amount` (in `sourceCurrency`, defaults to EUR) to the user's preferred currency and format it */
  formatPrice: (amount: number, sourceCurrency?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'EUR',
  rates: FALLBACK_RATES,
  ratesLoaded: false,
  setCurrency: () => {},
  formatPrice: (a) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(a),
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [currency, setCurrencyState] = useState<Currency>('EUR');
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [ratesLoaded, setRatesLoaded] = useState(false);

  // Fetch live rates once on mount
  useEffect(() => {
    fetch('/api/exchange-rates')
      .then((r) => r.json())
      .then((d: { rates?: Record<string, number> }) => {
        if (d.rates) {
          setRates(d.rates);
          setRatesLoaded(true);
        }
      })
      .catch(() => setRatesLoaded(true)); // fallback rates already set
  }, []);

  // Sync currency preference: server (session) > localStorage > EUR
  useEffect(() => {
    const sessionCurrency = (session?.user as { preferredCurrency?: string })?.preferredCurrency;
    if (sessionCurrency && (SUPPORTED_CURRENCIES as readonly string[]).includes(sessionCurrency)) {
      setCurrencyState(sessionCurrency as Currency);
      return;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Currency | null;
      if (saved && (SUPPORTED_CURRENCIES as readonly string[]).includes(saved)) {
        setCurrencyState(saved);
      }
    } catch {
      // localStorage not available
    }
  }, [session]);

  const setCurrency = useCallback(
    (c: Currency) => {
      setCurrencyState(c);
      try {
        localStorage.setItem(STORAGE_KEY, c);
      } catch {
        // localStorage not available
      }
      // Persist to server when the user is logged in
      if (session) {
        fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferredCurrency: c }),
        }).catch(console.error);
      }
    },
    [session]
  );

  const formatPrice = useCallback(
    (amount: number, sourceCurrency = 'EUR'): string => {
      // Step 1: convert source → EUR
      const toEur =
        sourceCurrency === 'EUR'
          ? amount
          : amount / (rates[sourceCurrency] ?? FALLBACK_RATES[sourceCurrency] ?? 1);

      // Step 2: convert EUR → user's preferred currency
      const converted = toEur * (rates[currency] ?? FALLBACK_RATES[currency] ?? 1);

      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          maximumFractionDigits: ['RSD', 'HRK', 'BAM'].includes(currency) ? 0 : 2,
          minimumFractionDigits: ['RSD', 'HRK', 'BAM'].includes(currency) ? 0 : 2,
        }).format(converted);
      } catch {
        return `${currency} ${converted.toFixed(2)}`;
      }
    },
    [currency, rates]
  );

  return (
    <CurrencyContext.Provider value={{ currency, rates, ratesLoaded, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCurrency() {
  return useContext(CurrencyContext);
}
