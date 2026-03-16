import { NextResponse } from "next/server";
import {
  fetchOutscraperReviews,
  fetchDiverseReviews,
} from "@/lib/outscraper";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { placeId, mode, limit, sort } = await request.json();

    if (!placeId) {
      return NextResponse.json(
        { error: "placeId required" },
        { status: 400 }
      );
    }

    const start = Date.now();

    if (mode === "diverse") {
      const reviews = await fetchDiverseReviews(placeId);
      return NextResponse.json({
        reviews,
        reviewCount: reviews.length,
        durationMs: Date.now() - start,
        mode: "diverse",
      });
    }

    // Single fetch mode
    const place = await fetchOutscraperReviews(
      placeId,
      limit ?? 30,
      sort ?? "newest"
    );

    return NextResponse.json({
      place,
      reviewCount: place?.reviews_data?.length ?? 0,
      totalReviews: place?.reviews ?? 0,
      rating: place?.rating ?? null,
      durationMs: Date.now() - start,
      mode: "single",
    });
  } catch (err) {
    console.error("data/reviews error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
