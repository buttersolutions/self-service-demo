import { NextResponse } from "next/server";
import { fetchApifyReviews } from "@/lib/apify-reviews";

export const maxDuration = 30;

/**
 * Pre-warm the Apify Google Maps Reviews Scraper actor.
 * Fires a tiny limit:1 call so the actor instance is hot when the real
 * analysis pipeline runs ~10-30s later. Fire-and-forget — we don't care
 * about the response, only that the actor warms up.
 */
export async function POST(request: Request) {
  try {
    const { placeId } = await request.json();
    if (!placeId) {
      return NextResponse.json({ error: "placeId required" }, { status: 400 });
    }

    // Fire and don't wait for the result — just kick off the actor
    fetchApifyReviews([placeId], 1, "newest", 30).catch(() => {
      // ignore — this is just to warm the actor
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
