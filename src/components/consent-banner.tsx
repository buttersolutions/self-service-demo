'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

const STORAGE_KEY = 'ag_consent_analytics';
type ConsentValue = 'granted' | 'denied';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function applyConsent(value: ConsentValue) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];
  // Google Consent Mode v2 update
  window.dataLayer.push({
    event: 'consent_update',
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  });
  // Meta Pixel gating: grant/revoke consent
  const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
  if (typeof fbq === 'function') {
    fbq('consent', value === 'granted' ? 'grant' : 'revoke');
  }
}

export function ConsentBanner() {
  const [decided, setDecided] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'granted' || stored === 'denied') {
        setDecided(true);
        applyConsent(stored);
      } else {
        setDecided(false);
      }
    } catch {
      setDecided(false);
    }
  }, []);

  const handle = (value: ConsentValue) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    applyConsent(value);
    setDecided(true);
  };

  return (
    <>
      {/*
       * Google Consent Mode v2 defaults — must run BEFORE GTM loads tags.
       * Strategy="beforeInteractive" is only honoured in _document on the
       * pages router; on App Router this still runs before user interaction
       * and that is early enough for consent defaults in practice.
       */}
      <Script id="consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            wait_for_update: 500
          });
        `}
      </Script>

      {decided === false && (
        <div
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-[100] bg-white border border-gray-200 rounded-lg shadow-lg p-4"
          role="dialog"
          aria-label="Cookie consent"
        >
          <p className="text-sm text-gray-700">
            We use cookies and similar tools to understand how this demo is used
            and to measure ad performance. You can change your choice any time.
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handle('denied')}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => handle('granted')}
              className="text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 rounded px-3 py-1.5"
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </>
  );
}
