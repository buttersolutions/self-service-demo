import { NextResponse } from 'next/server';
import { fetchApifyReviews } from '@/lib/apify-reviews';

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { placeIds, limit = 10 } = await request.json();

    if (!placeIds || !Array.isArray(placeIds) || placeIds.length === 0) {
      return NextResponse.json({ error: 'placeIds array is required' }, { status: 400 });
    }

    const ids = placeIds.slice(0, 5);
    const apifyReviews = await fetchApifyReviews(ids, limit, 'mostRelevant', 60);

    const reviews = apifyReviews.map((r) => ({
      author: r.reviewerName,
      rating: r.stars,
      text: r.text,
      date: r.publishedAtDate,
    }));

    return NextResponse.json({ reviews });
  } catch {
    return NextResponse.json({ reviews: [] });
  }
}
