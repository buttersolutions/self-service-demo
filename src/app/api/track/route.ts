import { NextResponse } from 'next/server';
import { sendGa4Event } from '@/lib/tracking/ga4-mp';
import { sendMetaCapiEvent } from '@/lib/tracking/meta-capi';
import type { TrackEventName, TrackUserData } from '@/lib/tracking/events';

export const runtime = 'nodejs';

interface TrackPayload {
  name: TrackEventName;
  props: Record<string, unknown>;
  event_id: string;
  user_data?: TrackUserData;
  page_url?: string;
  referrer?: string;
}

function parseCookieHeader(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(';')
      .map((c) => c.trim().split('='))
      .filter((pair): pair is [string, string] => pair.length === 2)
      .map(([k, v]) => [k, decodeURIComponent(v)]),
  );
}

// _ga cookie format: GA1.2.<client_id>.<timestamp>  → client_id = "1234567890.1234567890"
function extractGaClientId(gaCookie: string | undefined): string | undefined {
  if (!gaCookie) return undefined;
  const parts = gaCookie.split('.');
  if (parts.length < 4) return undefined;
  return `${parts[2]}.${parts[3]}`;
}

export async function POST(req: Request) {
  let payload: TrackPayload;
  try {
    payload = (await req.json()) as TrackPayload;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (!payload?.name || !payload?.event_id) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  const cookies = parseCookieHeader(req.headers.get('cookie'));
  const userAgent = req.headers.get('user-agent') ?? undefined;
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    undefined;

  const ga4ClientId = extractGaClientId(cookies._ga) ?? payload.event_id;

  await Promise.allSettled([
    sendGa4Event({
      eventName: payload.name,
      eventId: payload.event_id,
      clientId: ga4ClientId,
      props: payload.props,
      pageUrl: payload.page_url,
      userAgent,
      ipOverride: ip,
    }),
    sendMetaCapiEvent({
      eventName: payload.name,
      eventId: payload.event_id,
      pageUrl: payload.page_url,
      userAgent,
      ip,
      fbp: cookies._fbp,
      fbc: cookies._fbc,
      userData: payload.user_data,
      props: payload.props,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
