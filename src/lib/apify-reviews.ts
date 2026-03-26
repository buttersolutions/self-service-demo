const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "compass~google-maps-reviews-scraper";
const BASE = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items`;

export type ApifySort = "newest" | "mostRelevant" | "highestRanking" | "lowestRanking";

export interface ApifyReview {
  name: string; // place name
  placeId: string;
  reviewerName: string;
  reviewerId: string;
  text: string;
  stars: number;
  publishedAtDate: string;
  likesCount: number;
  responseFromOwnerText?: string;
}

/**
 * Fetch reviews for one or more places via Apify's Google Maps Reviews Scraper.
 * Uses synchronous actor execution — blocks until results are ready (max 300s).
 * Batching multiple placeIds into one call is the key speed advantage over Outscraper.
 */
export async function fetchApifyReviews(
  placeIds: string[],
  maxReviews = 50,
  sort: ApifySort = "newest",
  timeoutSecs = 120,
): Promise<ApifyReview[]> {
  if (!APIFY_TOKEN) throw new Error("APIFY_TOKEN not configured");
  if (placeIds.length === 0) return [];

  const url = `${BASE}?token=${APIFY_TOKEN}&format=json&timeout=${timeoutSecs}`;

  const controller = new AbortController();
  const clientTimeout = setTimeout(() => controller.abort(), timeoutSecs * 1000);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      placeIds,
      maxReviews,
      reviewsSort: sort,
      language: "en",
      personalData: true,
    }),
    signal: controller.signal,
  });

  clearTimeout(clientTimeout);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify error (${res.status}): ${text.slice(0, 200)}`);
  }

  const items: ApifyReview[] = await res.json();
  return items.filter((r) => r.text && r.text.trim().length > 0);
}

/**
 * Maps Apify sort names to the values used in the SSE pipeline.
 * Outscraper used: "newest" | "lowest_rating" | "highest_rating"
 * Apify uses: "newest" | "lowestRanking" | "highestRanking"
 */
export function mapSort(
  sort: "newest" | "lowest_rating" | "highest_rating" | "most_relevant",
): ApifySort {
  switch (sort) {
    case "newest": return "newest";
    case "lowest_rating": return "lowestRanking";
    case "highest_rating": return "highestRanking";
    case "most_relevant": return "mostRelevant";
  }
}
