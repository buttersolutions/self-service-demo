import Anthropic from "@anthropic-ai/sdk";
import { fetchApifyReviews, mapSort, type ApifyReview } from "@/lib/apify-reviews";
import { getPlaceDetails } from "@/lib/google-places";
import type { PlaceSummary, ReviewAnalysis, ReviewInsight, CategoryBreakdown } from "@/lib/types";

export const maxDuration = 300;

const anthropic = new Anthropic();

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

interface ReviewForAnalysis {
  author: string;
  rating: number;
  text: string;
  date: string;
  locationName: string;
}

const CATEGORY_MODULE_MAP: Record<string, string> = {
  "service-attitude": "Chat & Newsfeed",
  "speed-efficiency": "To-Do's & Handbooks",
  "training-knowledge": "Learning & Development",
  "consistency": "Learning & Development",
  "dietary-safety": "Compliance & Safety",
  "staffing": "People & HRIS",
};

const PER_LOCATION_PROMPT = `You are analyzing customer reviews for a hospitality business. Extract insights that reveal how well the team operates — things that internal systems can fix.

CATEGORIES (only use these):

1. **Service & Hospitality** (category: "service-attitude", module: "Chat & Newsfeed")
   Positive signals: "friendly staff", "welcoming", "attentive", staff named and praised, "made us feel special", "looked after us"
   Negative signals: "ignored us", "rude", "no one came to our table", "staff walked past", "felt forgotten", "unhelpful"

2. **Speed & Efficiency** (category: "speed-efficiency", module: "To-Do's & Handbooks")
   Positive: "food came quickly", "fast service", "served promptly", "didn't wait long"
   Negative: "slow service", "waited ages", "took forever", "had to ask multiple times", "long wait"

3. **Training & Knowledge** (category: "training-knowledge", module: "Learning & Development")
   Positive: "staff knew the menu well", "great recommendations", "explained everything"
   Negative: "didn't know ingredients", "couldn't answer questions", "seemed new/unsure", "got our order wrong"

4. **Consistency Across Locations** (category: "consistency", module: "Learning & Development")
   Signals: "this branch was different", "not as good as the other location", "quality varies", "inconsistent"

5. **Dietary & Allergen Handling** (category: "dietary-safety", module: "Compliance & Safety")
   Positive: "clearly labelled", "accommodated allergies", "great vegan options handled well"
   Negative: "couldn't confirm allergens", "wrong dish for dietary requirement", "cross-contamination concern"

6. **Staffing & Team** (category: "staffing", module: "People & HRIS")
   Signals: "understaffed", "overworked", "only one person serving", "clearly short-staffed", "high turnover feel"

RULES:
- Include BOTH positive and negative reviews
- SKIP reviews that are ONLY about food taste, decor, pricing, or portion size with zero operational angle
- Be selective — only extract reviews that clearly map to one of the 6 categories
- The "relevantExcerpt" must be a direct quote from the review, not your summary

Return valid JSON:
{
  "insights": [
    {
      "reviewAuthor": string,
      "reviewText": string (full review text),
      "reviewRating": number (1-5),
      "reviewDate": string,
      "sentiment": "positive" | "negative",
      "category": "service-attitude" | "speed-efficiency" | "training-knowledge" | "consistency" | "dietary-safety" | "staffing",
      "relevantExcerpt": string (exact quote from the review),
      "locationName": string,
      "allgravyModule": string
    }
  ],
  "positiveCount": number,
  "negativeCount": number,
  "totalReviewsAnalyzed": number
}

Reviews:
`;

const MERGE_PROMPT = `You have operational insights extracted from customer reviews across multiple locations. Create a summary that frames findings as opportunities for an internal team platform.

Categories map to platform modules:
- "service-attitude" → Chat & Newsfeed (internal team communication)
- "speed-efficiency" → To-Do's & Handbooks (task management, SOPs, checklists)
- "training-knowledge" → Learning & Development (training courses, knowledge base)
- "consistency" → Learning & Development (standardized training across locations)
- "dietary-safety" → Compliance & Safety (allergen training, food safety)
- "staffing" → People & HRIS (scheduling, retention, team management)

Rules:
- headline: Max 12 words. Specific to this business. Highlight the strongest positive AND the biggest opportunity.
- body: 2-3 sentences. Acknowledge what's working, then frame the top 1-2 problems as solvable with the right internal tools. No jargon.
- strengths: Top 2-3 things customers consistently praise about the team/operations (short phrases)
- opportunities: Top 2-3 actionable improvements tied to a platform module (e.g. "Service speed via task checklists", "Allergen confidence via compliance training")
- categoryBreakdown: For each category found, calculate percentage of total insights and whether it's mostly positive, negative, or mixed.

Return valid JSON:
{
  "headline": string,
  "body": string,
  "strengths": string[],
  "opportunities": string[],
  "categoryBreakdown": [
    { "category": string, "allgravyModule": string, "percentage": number, "count": number, "sentiment": "mostly-positive" | "mostly-negative" | "mixed" }
  ]
}

Here are the per-location summaries:
`;

// Keywords that signal a review has operational content worth analyzing.
// Built from manual analysis of 150+ real reviews across multiple chains.
const SIGNAL_KEYWORDS = [
  // Service & hospitality
  'staff', 'waiter', 'waitress', 'server', 'service', 'friendly', 'rude',
  'attentive', 'welcoming', 'ignored', 'helpful', 'unhelpful', 'polite',
  'impolite', 'smile', 'attitude', 'hospitality', 'accommodating',
  // Speed & efficiency
  'slow', 'fast', 'quick', 'wait', 'waited', 'waiting', 'took forever',
  'prompt', 'speedy', 'efficient', 'long time', 'ages', 'delay',
  // Training & knowledge
  'recommend', 'suggestion', 'explained', 'wrong order', 'mix up',
  'mixed up', 'mistake', 'forgot', 'forgotten', 'confused', 'knew',
  'knowledge', 'trained', 'inexperienced', 'new staff',
  // Consistency
  'branch', 'location', 'other location', 'inconsistent', 'different',
  'last time', 'compared to', 'used to be',
  // Dietary & safety
  'allerg', 'vegan', 'vegetarian', 'gluten', 'dietary', 'intolerance',
  'coeliac', 'celiac', 'cross-contam', 'hygiene', 'clean', 'dirty',
  // Staffing
  'understaffed', 'short-staffed', 'busy', 'overwhelmed', 'only one',
  'not enough', 'overworked', 'manager',
  // Negative sentiment boosters (low-rating reviews with these are high-signal)
  'disappoint', 'terrible', 'awful', 'worst', 'never again', 'avoid',
  'unacceptable', 'complaint', 'poor',
];

const SIGNAL_PATTERN = new RegExp(SIGNAL_KEYWORDS.join('|'), 'i');

function preFilterReviews(reviews: ReviewForAnalysis[]): ReviewForAnalysis[] {
  const filtered: ReviewForAnalysis[] = [];

  for (const r of reviews) {
    // Always include low-rated reviews (1-2 stars) — they almost always have operational signal
    if (r.rating <= 2) {
      filtered.push(r);
      continue;
    }

    // For 3+ star reviews, check for keyword signals
    if (SIGNAL_PATTERN.test(r.text)) {
      filtered.push(r);
    }
  }

  return filtered;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function analyzeBatch(
  reviews: ReviewForAnalysis[]
): Promise<{
  insights: ReviewInsight[];
  positiveCount: number;
  negativeCount: number;
  totalReviewsAnalyzed: number;
} | null> {
  if (!reviews.length) return null;

  const reviewsText = reviews
    .map(
      (r, i) =>
        `[${i + 1}] Location: ${r.locationName} | Author: ${r.author} | Rating: ${r.rating}/5 | Date: ${r.date}\n${r.text}`
    )
    .join("\n\n");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content: PER_LOCATION_PROMPT + reviewsText }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      insights: (parsed.insights ?? []).map((m: ReviewInsight) => ({
        reviewAuthor: m.reviewAuthor ?? "",
        reviewText: m.reviewText ?? "",
        reviewRating: m.reviewRating ?? 0,
        reviewDate: m.reviewDate ?? "",
        sentiment: m.sentiment ?? "positive",
        category: m.category ?? "service-quality",
        relevantExcerpt: m.relevantExcerpt ?? "",
        locationName: m.locationName ?? "",
        allgravyModule: m.allgravyModule ?? CATEGORY_MODULE_MAP[m.category] ?? "Task Management",
      })),
      positiveCount: parsed.positiveCount ?? 0,
      negativeCount: parsed.negativeCount ?? 0,
      totalReviewsAnalyzed: parsed.totalReviewsAnalyzed ?? reviews.length,
    };
  } catch {
    return null;
  }
}

async function runMerge(insights: ReviewInsight[]): Promise<{
  headline: string;
  body: string;
  strengths: string[];
  opportunities: string[];
  categoryBreakdown: CategoryBreakdown[];
}> {
  const summaryText = insights
    .map(
      (m) =>
        `[${m.sentiment.toUpperCase()}] ${m.locationName} — "${m.relevantExcerpt}" (category: ${m.category}, module: ${m.allgravyModule})`
    )
    .join("\n");

  const mergeMessage = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [{ role: "user", content: MERGE_PROMPT + summaryText }],
  });

  const mergeText =
    mergeMessage.content[0].type === "text" ? mergeMessage.content[0].text : "";
  const mergeJson = mergeText.match(/\{[\s\S]*\}/);

  if (mergeJson) {
    try {
      const parsed = JSON.parse(mergeJson[0]);
      return {
        headline: parsed.headline ?? "",
        body: parsed.body ?? "",
        strengths: parsed.strengths ?? [],
        opportunities: parsed.opportunities ?? [],
        categoryBreakdown: (parsed.categoryBreakdown ?? []).map((c: CategoryBreakdown) => ({
          category: c.category ?? "",
          allgravyModule: c.allgravyModule ?? "",
          percentage: c.percentage ?? 0,
          count: c.count ?? 0,
          sentiment: c.sentiment ?? "mixed",
        })),
      };
    } catch {
      // fall through
    }
  }
  return { headline: "", body: "", strengths: [], opportunities: [], categoryBreakdown: [] };
}

// Apify review fetch configs — one call per sort order, all placeIds batched
const REVIEW_FETCHES_FULL: { limit: number; sort: "newest" | "lowest_rating" | "highest_rating" }[] = [
  { limit: 50, sort: "newest" },
  { limit: 25, sort: "lowest_rating" },
  { limit: 25, sort: "highest_rating" },
];

const REVIEW_FETCHES_LITE: { limit: number; sort: "newest" | "lowest_rating" | "highest_rating" }[] = [
  { limit: 30, sort: "newest" },
];

export async function POST(request: Request) {
  const url = new URL(request.url);
  const lite = url.searchParams.get("lite") === "1";

  const { locations: rawLocations } = (await request.json()) as {
    locations: PlaceSummary[];
  };

  // In lite mode, cap to 1 location for speed
  const locations = lite ? rawLocations.slice(0, 1) : rawLocations;

  if (!locations?.length) {
    return Response.json({ error: "locations required" }, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sseEvent(event, data)));

      // t0 = pipeline start, all timing offsets relative to this
      const t0 = Date.now();
      const ts = () => Date.now() - t0; // ms since pipeline start

      try {
        const reviewFetches = lite ? REVIEW_FETCHES_LITE : REVIEW_FETCHES_FULL;
        const batchSize = 10; // balanced: small enough for quality, large enough for speed

        // Start place details fetch immediately in parallel (skip in lite mode)
        let detailsPromise: Promise<(Awaited<ReturnType<typeof getPlaceDetails>> | null)[]> | null = null;
        if (!lite) {
          const detailsStart = ts();
          detailsPromise = Promise.all(
            locations.map((loc) => getPlaceDetails(loc.placeId).catch(() => null))
          ).then((results) => {
            emit("timing", {
              id: "place_details",
              label: "Place Details (Google)",
              startMs: detailsStart,
              endMs: ts(),
              detail: `${results.filter(Boolean).length} locations`,
            });
            return results;
          });
        }

        const allInsights: ReviewInsight[] = [];
        let totalPositive = 0;
        let totalNegative = 0;
        let totalReviews = 0;
        let batchCounter = 0;

        // Build placeId → location lookup
        const locMap = new Map(locations.map((loc) => [loc.placeId, loc]));
        const allPlaceIds = locations.map((loc) => loc.placeId);
        const seen = new Set<string>();
        const allReviewsForAnalysis: ReviewForAnalysis[] = [];

        // PHASE 1: Collect all reviews from Apify (parallel sort-order fetches)
        await Promise.all(
          reviewFetches.map(async ({ limit, sort }) => {
            const fetchStart = ts();
            try {
              const apifySort = mapSort(sort);
              const reviews = await fetchApifyReviews(allPlaceIds, limit, apifySort);

              emit("timing", {
                id: `apify_${sort}`,
                label: `Apify ${sort}`,
                startMs: fetchStart,
                endMs: ts(),
                detail: `${reviews.length} reviews across ${allPlaceIds.length} places`,
              });

              // Dedupe and collect
              const countByPlace = new Map<string, number>();
              for (const r of reviews) {
                const key = `${r.reviewerId}|${r.publishedAtDate}`;
                if (seen.has(key)) continue;
                seen.add(key);

                const loc = locMap.get(r.placeId);
                const locationName = loc?.displayName ?? r.name ?? "Unknown";

                allReviewsForAnalysis.push({
                  author: r.reviewerName,
                  rating: r.stars,
                  text: r.text,
                  date: r.publishedAtDate,
                  locationName,
                });

                countByPlace.set(r.placeId, (countByPlace.get(r.placeId) ?? 0) + 1);
              }

              // Emit progress per location
              for (const [placeId, count] of countByPlace) {
                const loc = locMap.get(placeId);
                emit("reviews_progress", {
                  placeId,
                  displayName: loc?.displayName ?? placeId,
                  reviewCount: count,
                  sort,
                });
              }
            } catch (err) {
              emit("timing", {
                id: `apify_${sort}`,
                label: `Apify ${sort}`,
                startMs: fetchStart,
                endMs: ts(),
                detail: `FAILED: ${err instanceof Error ? err.message : String(err)}`,
                error: true,
              });
            }
          })
        );

        emit("reviews_complete", { totalReviews: allReviewsForAnalysis.length });

        // PHASE 2: Pre-filter reviews by keyword signals before sending to Haiku
        const filtered = preFilterReviews(allReviewsForAnalysis);
        emit("timing", {
          id: "prefilter",
          label: "Keyword pre-filter",
          startMs: ts(),
          endMs: ts(),
          detail: `${allReviewsForAnalysis.length} → ${filtered.length} high-signal reviews`,
        });

        // Analyze filtered reviews in parallel Haiku batches
        const analysisBatches = chunkArray(filtered, batchSize);
        await Promise.all(
          analysisBatches.map(async (batch) => {
            const globalIdx = batchCounter++;
            const batchStart = ts();
            const result = await analyzeBatch(batch);
            emit("timing", {
              id: `haiku_batch_${globalIdx}`,
              label: `Haiku batch #${globalIdx}`,
              startMs: batchStart,
              endMs: ts(),
              detail: `${batch.length} reviews → ${result?.insights.length ?? 0} insights`,
            });

            if (result && result.insights.length > 0) {
              allInsights.push(...result.insights);
              totalPositive += result.positiveCount;
              totalNegative += result.negativeCount;
              totalReviews += result.totalReviewsAnalyzed;

              emit("batch_analysis", {
                placeId: batch[0]?.locationName ?? "",
                displayName: batch[0]?.locationName ?? "",
                batchIndex: globalIdx,
                insights: result.insights,
              });
            }
          })
        );

        // Final merge with ALL insights
        let reviewAnalysis: ReviewAnalysis | null = null;

        if (allInsights.length > 0) {
          emit("analyzing", {});
          const mergeStart = ts();
          const merged = await runMerge(allInsights);
          emit("timing", {
            id: "final_merge",
            label: "Final merge (Haiku)",
            startMs: mergeStart,
            endMs: ts(),
            detail: `${allInsights.length} insights`,
          });

          reviewAnalysis = {
            ...merged,
            insights: allInsights,
            totalReviewsAnalyzed: totalReviews,
            positiveCount: totalPositive,
            negativeCount: totalNegative,
          };

          emit("analysis", reviewAnalysis);
        }

        // Await place details (skip in lite mode)
        let locationDetails: (Awaited<ReturnType<typeof getPlaceDetails>> | null)[] = [];
        if (detailsPromise) {
          const detailsResults = await detailsPromise;
          locationDetails = detailsResults.filter(Boolean);
        }

        emit("details", locationDetails);

        emit("timing", {
          id: "total",
          label: "Total pipeline",
          startMs: 0,
          endMs: ts(),
          detail: `${locations.length} locations, ${totalReviews} reviews, ${allInsights.length} insights`,
        });

        emit("done", {
          place: locations[0],
          locations,
          locationDetails,
          reviewAnalysis,
        });
      } catch (err) {
        emit("error", { message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
