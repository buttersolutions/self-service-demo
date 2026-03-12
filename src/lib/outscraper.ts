const API_KEY = process.env.OUTSCRAPER_API_KEY!;
const BASE = "https://api.app.outscraper.com";

export interface OutscraperReview {
  autor_name: string;
  autor_id: string;
  autor_link: string;
  review_text: string;
  review_rating: number;
  review_timestamp: number;
  review_datetime_utc: string;
  review_likes: number;
  owner_answer?: string;
  owner_answer_timestamp?: number;
}

export interface OutscraperPlace {
  name: string;
  google_id: string;
  place_id: string;
  full_address: string;
  rating: number;
  reviews: number;
  reviews_data: OutscraperReview[];
}

export async function fetchOutscraperReviews(
  placeId: string,
  reviewsLimit = 30,
  sort: "most_relevant" | "newest" | "highest_rating" | "lowest_rating" = "newest"
): Promise<OutscraperPlace | null> {
  const res = await fetch(
    `${BASE}/maps/reviews-v2?` +
      new URLSearchParams({
        query: placeId,
        reviewsLimit: String(reviewsLimit),
        sort,
        language: "en",
        async: "false",
      }),
    {
      headers: { "X-API-KEY": API_KEY },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Outscraper API error (${res.status}): ${text}`);
  }

  const data = await res.json();

  // Response is { id, status, data: [place, ...] }
  const place = data?.data?.[0];
  if (!place) return null;

  return place as OutscraperPlace;
}

export async function fetchOutscraperReviewsBatch(
  placeIds: string[],
  reviewsLimit = 30,
  sort: "most_relevant" | "newest" | "highest_rating" | "lowest_rating" = "newest"
): Promise<(OutscraperPlace | null)[]> {
  // Outscraper supports batching up to 25 queries
  const batch = placeIds.slice(0, 25);

  const results = await Promise.allSettled(
    batch.map((id) => fetchOutscraperReviews(id, reviewsLimit, sort))
  );

  return results.map((r) =>
    r.status === "fulfilled" ? r.value : null
  );
}
