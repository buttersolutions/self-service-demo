import 'server-only';
import { sha256Lower } from './hash';
import type { TrackEventName, TrackUserData } from './events';

interface CapiInput {
  eventName: TrackEventName;
  eventId: string;
  eventTimeMs?: number;
  pageUrl?: string;
  userAgent?: string;
  ip?: string;
  fbp?: string;
  fbc?: string;
  userData?: TrackUserData;
  props: Record<string, unknown>;
}

const API_VERSION = 'v20.0';

// Meta CAPI expects its own event names for standard events. For custom events
// we pass the name through and tag event_name accordingly — Meta treats unknown
// names as custom events, which is fine.
const STANDARD_EVENT_MAP: Partial<Record<TrackEventName, string>> = {
  booking_completed: 'Schedule',
  booking_started: 'InitiateCheckout',
  search_submitted: 'Search',
};

export async function sendMetaCapiEvent(input: CapiInput): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) return;

  const eventName = STANDARD_EVENT_MAP[input.eventName] ?? input.eventName;

  const userData: Record<string, unknown> = {};
  if (input.ip) userData.client_ip_address = input.ip;
  if (input.userAgent) userData.client_user_agent = input.userAgent;
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;
  const emailHash = sha256Lower(input.userData?.email);
  if (emailHash) userData.em = [emailHash];
  const phoneHash = sha256Lower(input.userData?.phone);
  if (phoneHash) userData.ph = [phoneHash];
  const fnHash = sha256Lower(input.userData?.firstName);
  if (fnHash) userData.fn = [fnHash];
  const lnHash = sha256Lower(input.userData?.lastName);
  if (lnHash) userData.ln = [lnHash];
  const countryHash = sha256Lower(input.userData?.country);
  if (countryHash) userData.country = [countryHash];
  const externalIdHash = sha256Lower(input.userData?.externalId);
  if (externalIdHash) userData.external_id = [externalIdHash];

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor((input.eventTimeMs ?? Date.now()) / 1000),
        event_id: input.eventId,
        action_source: 'website' as const,
        event_source_url: input.pageUrl,
        user_data: userData,
        custom_data: input.props,
      },
    ],
  };

  const url = `https://graph.facebook.com/${API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(
    accessToken,
  )}`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
