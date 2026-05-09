'use client';

import Script from 'next/script';
import { useState, useEffect } from 'react';
import { getConsent } from '@/components/ui/CookieConsent';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function Analytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Check consent already stored
    const consent = getConsent();
    if (consent?.analytics) setAllowed(true);

    // React to consent changes (e.g. user clicks "Accept all" after page load)
    const handler = (e: Event) => {
      setAllowed(!!(e as CustomEvent<{ analytics: boolean }>).detail?.analytics);
    };
    window.addEventListener('cookie-consent-update', handler);
    return () => window.removeEventListener('cookie-consent-update', handler);
  }, []);

  if (!GA_ID || !allowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_ID}', { page_path: window.location.pathname });
      `}</Script>
    </>
  );
}
