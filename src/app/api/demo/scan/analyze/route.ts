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

// ── Category definitions ────────────────────────────────────────────

interface CategoryDef {
  id: string;
  module: string;
  label: string;
  keywords: RegExp;
  prompt: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "service-attitude",
    module: "Chat & Newsfeed",
    label: "Service & Hospitality",
    keywords: /staff|waiter|waitress|server|service|friendly|rude|attentive|welcoming|ignored|helpful|unhelpful|polite|impolite|smile|attitude|hospitality|accommodat|looked after|felt forgotten|walked past/i,
    prompt: `These reviews likely mention SERVICE & HOSPITALITY. For each review, confirm if it contains a signal about staff friendliness, attentiveness, or service attitude. Extract the relevant excerpt.
Positive: friendly, welcoming, attentive, staff praised by name, "looked after us"
Negative: ignored, rude, unhelpful, "no one came to our table", "felt forgotten"`,
  },
  {
    id: "speed-efficiency",
    module: "To-Do's & Handbooks",
    label: "Speed & Efficiency",
    keywords: /slow|fast|quick|wait|waited|waiting|took forever|prompt|speedy|efficient|long time|ages|delay|hurry|minutes/i,
    prompt: `These reviews likely mention SPEED & EFFICIENCY. For each review, confirm if it contains a signal about service speed, wait times, or operational efficiency. Extract the relevant excerpt.
Positive: fast service, food came quickly, prompt, efficient
Negative: slow, waited ages, took forever, long wait, had to ask multiple times`,
  },
  {
    id: "training-knowledge",
    module: "Learning & Development",
    label: "Training & Knowledge",
    keywords: /recommend|suggestion|explained|wrong order|mix up|mixed up|mistake|forgot|forgotten|confused|knew|knowledge|trained|inexperienced|new staff|didn't know|couldn't answer/i,
    prompt: `These reviews likely mention TRAINING & KNOWLEDGE. For each review, confirm if it contains a signal about staff knowledge, training, order accuracy, or recommendations. Extract the relevant excerpt.
Positive: great recommendations, knew the menu, explained everything
Negative: got order wrong, didn't know ingredients, seemed unsure, mistake`,
  },
  {
    id: "consistency",
    module: "Learning & Development",
    label: "Consistency Across Locations",
    keywords: /branch|other location|inconsistent|different from|last time|compared to|used to be|varies|varying|standards/i,
    prompt: `These reviews likely mention CONSISTENCY ACROSS LOCATIONS. For each review, confirm if it compares this location to others, mentions inconsistent quality, or references different standards. Extract the relevant excerpt.`,
  },
  {
    id: "dietary-safety",
    module: "Compliance & Safety",
    label: "Dietary & Allergen Handling",
    keywords: /allerg|vegan|vegetarian|gluten|dietary|intolerance|coeliac|celiac|cross-contam|hygiene|clean|dirty|food safety/i,
    prompt: `These reviews likely mention DIETARY & ALLERGEN HANDLING. For each review, confirm if it contains a signal about allergen accommodation, dietary options handling, hygiene, or food safety. Extract the relevant excerpt.
Positive: clearly labelled, accommodated allergies, great vegan options
Negative: couldn't confirm allergens, wrong dish, cross-contamination, hygiene concern`,
  },
  {
    id: "staffing",
    module: "People & HRIS",
    label: "Staffing & Team",
    keywords: /understaffed|short-staffed|overwhelmed|only one|not enough|overworked|manager|turnover|short.staff/i,
    prompt: `These reviews likely mention STAFFING issues. For each review, confirm if it contains a signal about understaffing, overworked team, management issues, or team morale. Extract the relevant excerpt.`,
  },
];

// ── Prompts ─────────────────────────────────────────────────────────

function buildCategoryPrompt(cat: CategoryDef): string {
  return `${cat.prompt}

Category: "${cat.id}", Module: "${cat.module}"

For each review that DOES contain a signal, return it as an insight. Skip reviews that don't actually contain a clear signal for this category.

Return valid JSON:
{
  "insights": [
    {
      "reviewAuthor": string,
      "reviewText": string (full review text),
      "reviewRating": number (1-5),
      "reviewDate": string,
      "sentiment": "positive" | "negative",
      "category": "${cat.id}",
      "relevantExcerpt": string (exact quote from review),
      "locationName": string,
      "allgravyModule": "${cat.module}"
    }
  ],
  "positiveCount": number,
  "negativeCount": number,
  "totalReviewsAnalyzed": number
}

Reviews:
`;
}

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

Here are the insights:
`;

// ── Helpers ─────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Bucket reviews by likely category using keywords
function bucketReviews(reviews: ReviewForAnalysis[]): Map<CategoryDef, ReviewForAnalysis[]> {
  const buckets = new Map<CategoryDef, ReviewForAnalysis[]>();
  for (const cat of CATEGORIES) {
    buckets.set(cat, []);
  }

  for (const r of reviews) {
    // Low-rated reviews go to all matching buckets (high signal)
    // High-rated reviews go to the first matching bucket
    let matched = false;
    for (const cat of CATEGORIES) {
      if (cat.keywords.test(r.text)) {
        buckets.get(cat)!.push(r);
        matched = true;
        if (r.rating > 2) break; // high-rated: first match only
      }
    }
    // Low-rated with no keyword match still get analyzed (service-attitude default)
    if (!matched && r.rating <= 2) {
      buckets.get(CATEGORIES[0])!.push(r);
    }
  }

  return buckets;
}

async function analyzeCategoryBatch(
  cat: CategoryDef,
  reviews: ReviewForAnalysis[],
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
    system: [{ type: "text", text: buildCategoryPrompt(cat), cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: reviewsText }],
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
        category: cat.id,
        relevantExcerpt: m.relevantExcerpt ?? "",
        locationName: m.locationName ?? "",
        allgravyModule: cat.module,
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
    system: [{ type: "text", text: MERGE_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: summaryText }],
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

// ── Review fetch configs ────────────────────────────────────────────

const REVIEW_FETCHES_FULL: { limit: number; sort: "newest" | "lowest_rating" | "highest_rating" }[] = [
  { limit: 50, sort: "newest" },
  { limit: 25, sort: "lowest_rating" },
  { limit: 25, sort: "highest_rating" },
];

const REVIEW_FETCHES_LITE: { limit: number; sort: "newest" | "lowest_rating" | "highest_rating" }[] = [
  { limit: 200, sort: "newest" },
];

// ── Main handler ────────────────────────────────────────────────────

export async function POST(request: Request) {
  const url = new URL(request.url);
  const lite = url.searchParams.get("lite") === "1";

  const { locations: rawLocations } = (await request.json()) as {
    locations: PlaceSummary[];
  };

  const locations = lite ? rawLocations.slice(0, 1) : rawLocations;

  if (!locations?.length) {
    return Response.json({ error: "locations required" }, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sseEvent(event, data)));

      const t0 = Date.now();
      const ts = () => Date.now() - t0;

      try {
        const reviewFetches = lite ? REVIEW_FETCHES_LITE : REVIEW_FETCHES_FULL;

        // Start place details fetch in parallel (skip in lite mode)
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
        let mergeVersion = 0;
        let batchCounter = 0;

        const locMap = new Map(locations.map((loc) => [loc.placeId, loc]));
        const allPlaceIds = locations.map((loc) => loc.placeId);
        const seen = new Set<string>();
        const allReviewsForAnalysis: ReviewForAnalysis[] = [];

        // ── PHASE 1: Collect reviews from Apify (parallel) ──────────
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

        // ── PHASE 2: Bucket reviews by category keywords ────────────
        const buckets = bucketReviews(allReviewsForAnalysis);
        const bucketSummary = CATEGORIES
          .map((cat) => `${cat.label}: ${buckets.get(cat)!.length}`)
          .filter((s) => !s.endsWith(": 0"))
          .join(", ");
        emit("timing", {
          id: "bucketing",
          label: "Keyword bucketing",
          startMs: ts(),
          endMs: ts(),
          detail: `${allReviewsForAnalysis.length} reviews → ${bucketSummary}`,
        });

        // ── PHASE 3: Category-focused Haiku classification (all parallel) ──
        // Haiku batches run freely. Sonnet merges fire on a 5s interval, decoupled.
        const categoryPromises: Promise<void>[] = [];
        let lastMergedCount = 0;

        // Incremental Sonnet merges on a 5s interval (decoupled from Haiku)
        const mergeInterval = setInterval(async () => {
          if (allInsights.length > lastMergedCount) {
            const version = ++mergeVersion;
            const snapshot = [...allInsights];
            lastMergedCount = snapshot.length;
            const mergeStart = ts();
            try {
              const merged = await runMerge(snapshot);
              emit("timing", {
                id: `merge_v${version}`,
                label: `Sonnet merge v${version}`,
                startMs: mergeStart,
                endMs: ts(),
                detail: `${snapshot.length} insights`,
              });
              emit("analysis_update", {
                ...merged,
                insights: snapshot,
                totalReviewsAnalyzed: totalReviews,
                positiveCount: snapshot.filter((m) => m.sentiment === "positive").length,
                negativeCount: snapshot.filter((m) => m.sentiment === "negative").length,
              });
            } catch {
              // Will retry on next interval
            }
          }
        }, 5000);

        for (const cat of CATEGORIES) {
          const catReviews = buckets.get(cat)!;
          if (catReviews.length === 0) continue;

          const batches = chunkArray(catReviews, 10);
          for (const batch of batches) {
            categoryPromises.push(
              (async () => {
                const batchIdx = batchCounter++;
                const batchStart = ts();
                const result = await analyzeCategoryBatch(cat, batch);

                emit("timing", {
                  id: `haiku_${cat.id}_${batchIdx}`,
                  label: `Haiku ${cat.label}`,
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
                    placeId: cat.id,
                    displayName: cat.label,
                    batchIndex: batchIdx,
                    insights: result.insights,
                  });
                }
              })()
            );
          }
        }

        // Wait for all Haiku batches to complete (Sonnet merges run independently)
        await Promise.all(categoryPromises);
        clearInterval(mergeInterval);

        // ── Final merge if we have insights but no merge happened yet ──
        if (allInsights.length > 0) {
          const finalStart = ts();
          const merged = await runMerge(allInsights);
          emit("timing", {
            id: "final_merge",
            label: "Final Sonnet merge",
            startMs: finalStart,
            endMs: ts(),
            detail: `${allInsights.length} insights (final)`,
          });

          const reviewAnalysis: ReviewAnalysis = {
            ...merged,
            insights: allInsights,
            totalReviewsAnalyzed: totalReviews,
            positiveCount: totalPositive,
            negativeCount: totalNegative,
          };
          emit("analysis", reviewAnalysis);
        }

        // Await place details
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
          detail: `${locations.length} locations, ${allReviewsForAnalysis.length} reviews, ${allInsights.length} insights`,
        });

        emit("done", {
          place: locations[0],
          locations,
          locationDetails,
          reviewAnalysis: allInsights.length > 0 ? {
            headline: "",
            body: "",
            insights: allInsights,
            totalReviewsAnalyzed: totalReviews,
            positiveCount: totalPositive,
            negativeCount: totalNegative,
            categoryBreakdown: [],
            strengths: [],
            opportunities: [],
          } : null,
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
