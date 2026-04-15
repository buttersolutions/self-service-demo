'use client';

import type { TrackEvent, TrackUserData } from './events';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function hasConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('ag_consent_analytics') === 'granted';
  } catch {
    return false;
  }
}

/**
 * Fire an event to the browser dataLayer (picked up by GTM) and to the
 * server fan-out (/api/track) which forwards to GA4 + Meta CAPI.
 * Both paths share the same `event_id` so platforms dedupe.
 */
export function track<E extends TrackEvent>(evt: E, userData?: TrackUserData): void {
  if (typeof window === 'undefined') return;
  if (!hasConsent()) return;

  const eventId = uuid();
  const payload = { event_id: eventId, ...evt.props };

  // Client-side: push to GTM dataLayer.
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: evt.name, ...payload });

  // Server-side: fan-out to GA4 + Meta CAPI.
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: evt.name,
      props: evt.props,
      event_id: eventId,
      user_data: userData,
      page_url: window.location.href,
      referrer: document.referrer || undefined,
    }),
    keepalive: true,
  }).catch(() => {
    // swallow — never break UX on analytics failure
  });
}
