import { NextResponse } from 'next/server';
import { fetchOutscraperReviews } from '@/lib/outscraper';

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { placeIds, limit = 10 } = await request.json();

    if (!placeIds || !Array.isArray(placeIds) || placeIds.length === 0) {
      return NextResponse.json({ error: 'placeIds array is required' }, { status: 400 });
    }

    const ids = placeIds.slice(0, 1);

    const results = await Promise.allSettled(
      ids.map((id: string) =>
        Promise.race([
          fetchOutscraperReviews(id, limit, 'most_relevant'),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 45000)),
        ])
      ),
    );

    const reviews = results.flatMap((r) => {
      if (r.status !== 'fulfilled' || !r.value) return [];
      return r.value.reviews_data.map((rev) => ({
        author: rev.autor_name,
        rating: rev.review_rating,
        text: rev.review_text,
        date: rev.review_datetime_utc,
      }));
    });

    return NextResponse.json({ reviews });
  } catch {
    return NextResponse.json({ reviews: [] });
  }
}
