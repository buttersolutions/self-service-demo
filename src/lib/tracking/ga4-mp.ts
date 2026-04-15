import 'server-only';
import type { TrackEventName } from './events';

interface Ga4Input {
  eventName: TrackEventName;
  eventId: string;
  clientId: string;
  sessionId?: string;
  props: Record<string, unknown>;
  pageUrl?: string;
  userAgent?: string;
  ipOverride?: string;
}

const ENDPOINT = 'https://www.google-analytics.com/mp/collect';

export async function sendGa4Event(input: Ga4Input): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) return;

  const params: Record<string, unknown> = {
    ...input.props,
    event_id: input.eventId,
    page_location: input.pageUrl,
    engagement_time_msec: 1,
  };
  if (input.sessionId) params.session_id = input.sessionId;

  const body = {
    client_id: input.clientId,
    events: [{ name: input.eventName, params }],
  };

  const url = `${ENDPOINT}?measurement_id=${encodeURIComponent(
    measurementId,
  )}&api_secret=${encodeURIComponent(apiSecret)}`;

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(input.userAgent ? { 'User-Agent': input.userAgent } : {}),
    },
    body: JSON.stringify(body),
  });
}
