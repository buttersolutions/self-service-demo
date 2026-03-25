import Anthropic from "@anthropic-ai/sdk";
import { fetchOutscraperReviews } from "@/lib/outscraper";
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
  "internal-comms": "Chat & Newsfeed",
  "learning-development": "Learning & Development",
  "compliance-training": "Compliance & Safety",
  "operations": "To-Do's & Handbooks",
  "onboarding": "Onboarding",
  "people-management": "People & HRIS",
};

const PER_LOCATION_PROMPT = `Analyze these customer reviews to find insights that map to internal operational systems. You are looking for signals that indicate whether the business needs better:

1. **Internal Communications** (category: "internal-comms", module: "Chat & Newsfeed") — staff miscommunication, orders wrong, information not passed between shifts, front-of-house/back-of-house disconnect
2. **Learning & Development** (category: "learning-development", module: "Learning & Development") — untrained staff, inconsistent service, knowledge gaps, staff not knowing menu/products, new hire struggles
3. **Compliance & Safety Training** (category: "compliance-training", module: "Compliance & Safety") — hygiene issues, safety concerns, food handling, allergen mistakes, regulatory issues
4. **Operations & Task Management** (category: "operations", module: "To-Do's & Handbooks") — slow service, things forgotten, inconsistent standards across locations, process breakdowns, missing items
5. **Onboarding** (category: "onboarding", module: "Onboarding") — clearly new/inexperienced staff, staff unsure of procedures, first-day mistakes
6. **People Management** (category: "people-management", module: "People & HRIS") — understaffing, high turnover signals, overworked staff, management issues, team morale

Include BOTH positive (well-run operations, great teamwork, well-trained staff) and negative reviews. Skip reviews purely about food taste, decor, or prices with no operational angle.

Return valid JSON:
{
  "insights": [
    {
      "reviewAuthor": string,
      "reviewText": string (full text),
      "reviewRating": number (1-5),
      "reviewDate": string,
      "sentiment": "positive" | "negative",
      "category": "internal-comms" | "learning-development" | "compliance-training" | "operations" | "onboarding" | "people-management",
      "relevantExcerpt": string (the specific sentence about the operational issue),
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

const MERGE_PROMPT = `You have review analysis from multiple locations of the same business. Create a unified summary.

The categories map to Allgravy's internal systems platform:
- "internal-comms" → Chat & Newsfeed (team communication)
- "learning-development" → Learning & Development (LMS, training courses)
- "compliance-training" → Compliance & Safety (compliance tracking, safety training)
- "operations" → To-Do's & Handbooks (task management, SOPs)
- "onboarding" → Onboarding (new hire programs)
- "people-management" → People & HRIS (staffing, retention)

Rules:
- headline: Max 12 words. Lead with what's working well, hint at what could improve. Punchy and specific to this business.
- body: 2-3 sentences. First acknowledge strengths, then frame problems as opportunities that Allgravy's platform solves. Be specific about which modules help.
- strengths: Top 2-3 things customers love about service/operations (short phrases, not full sentences)
- opportunities: Top 2-3 problem areas phrased as what the Allgravy module would fix (e.g. "Shift handover communication via Chat & Newsfeed", "Service consistency via Learning & Development")
- categoryBreakdown: For each category found, calculate percentage of total insights and dominant sentiment.

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
    model: "claude-haiku-4-5-20251001",
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

// The 3 Outscraper calls we fire per location, independently
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
        const batchSize = lite ? 20 : 5;

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
        let preliminaryMergeFired = false;
        let preliminaryMergePromise: Promise<void> | null = null;
        let batchCounter = 0;

        const processLocation = async (loc: PlaceSummary) => {
          const seen = new Set<string>();
          let locationReviewCount = 0;
          let locationBatchIndex = 0;

          const analyzeWave = async (reviews: ReviewForAnalysis[], sort: string) => {
            if (!reviews.length) return;
            const batches = chunkArray(reviews, batchSize);
            await Promise.all(
              batches.map(async (batch) => {
                const idx = locationBatchIndex++;
                const globalIdx = batchCounter++;
                const batchStart = ts();
                const result = await analyzeBatch(batch);
                emit("timing", {
                  id: `haiku_batch_${globalIdx}`,
                  label: `Haiku batch #${globalIdx}`,
                  startMs: batchStart,
                  endMs: ts(),
                  detail: `${batch.length} reviews → ${result?.insights.length ?? 0} insights (${sort})`,
                  parent: `outscraper_${loc.placeId}_${sort}`,
                });

                if (result && result.insights.length > 0) {
                  allInsights.push(...result.insights);
                  totalPositive += result.positiveCount;
                  totalNegative += result.negativeCount;
                  totalReviews += result.totalReviewsAnalyzed;

                  emit("batch_analysis", {
                    placeId: loc.placeId,
                    displayName: loc.displayName,
                    batchIndex: idx,
                    insights: result.insights,
                  });

                  // Fire preliminary merge as soon as we have first insights (skip in lite)
                  if (!lite && !preliminaryMergeFired && allInsights.length > 0) {
                    preliminaryMergeFired = true;
                    const snapshot = [...allInsights];
                    const prelimStart = ts();
                    preliminaryMergePromise = runMerge(snapshot).then((merged) => {
                      emit("timing", {
                        id: "preliminary_merge",
                        label: "Preliminary merge (Haiku)",
                        startMs: prelimStart,
                        endMs: ts(),
                        detail: `${snapshot.length} insights`,
                      });
                      const prelimAnalysis: ReviewAnalysis = {
                        ...merged,
                        insights: snapshot,
                        totalReviewsAnalyzed: totalReviews,
                        positiveCount: snapshot.filter((m) => m.sentiment === "positive").length,
                        negativeCount: snapshot.filter((m) => m.sentiment === "negative").length,
                      };
                      emit("preliminary_analysis", prelimAnalysis);
                    }).catch(() => {});
                  }
                }
              })
            );
          };

          // Fire Outscraper calls concurrently, process each as it lands
          await Promise.all(
            reviewFetches.map(async ({ limit, sort }) => {
              const fetchStart = ts();
              try {
                const place = await Promise.race([
                  fetchOutscraperReviews(loc.placeId, limit, sort),
                  new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Outscraper timeout (60s)')), 60000)),
                ]);

                const rawCount = place?.reviews_data?.length ?? 0;

                // Dedupe against reviews we already have from other sort orders
                const newReviews: ReviewForAnalysis[] = [];
                for (const r of place?.reviews_data ?? []) {
                  if (!r.review_text) continue;
                  const key = `${r.autor_id}|${r.review_timestamp}`;
                  if (!seen.has(key)) {
                    seen.add(key);
                    newReviews.push({
                      author: r.autor_name,
                      rating: r.review_rating,
                      text: r.review_text,
                      date: r.review_datetime_utc,
                      locationName: loc.displayName,
                    });
                  }
                }

                const fetchEnd = ts();
                emit("timing", {
                  id: `outscraper_${loc.placeId}_${sort}`,
                  label: `Outscraper ${sort}`,
                  startMs: fetchStart,
                  endMs: fetchEnd,
                  detail: `${rawCount} raw → ${newReviews.length} new (limit ${limit})`,
                  parent: `location_${loc.placeId}`,
                });

                locationReviewCount += newReviews.length;

                emit("reviews_progress", {
                  placeId: loc.placeId,
                  displayName: loc.displayName,
                  reviewCount: locationReviewCount,
                  sort,
                });

                // Immediately analyze this wave
                await analyzeWave(newReviews, sort);
              } catch (err) {
                emit("timing", {
                  id: `outscraper_${loc.placeId}_${sort}`,
                  label: `Outscraper ${sort}`,
                  startMs: fetchStart,
                  endMs: ts(),
                  detail: `FAILED: ${err instanceof Error ? err.message : String(err)}`,
                  parent: `location_${loc.placeId}`,
                  error: true,
                });
              }
            })
          );

          emit("timing", {
            id: `location_${loc.placeId}`,
            label: `Location: ${loc.displayName}`,
            startMs: 0, // will be set by first child
            endMs: ts(),
            detail: `${locationReviewCount} reviews, ${locationBatchIndex} batches`,
          });
        };

        // In lite mode run all locations concurrently, otherwise batch by 5
        if (lite) {
          await Promise.all(locations.map(processLocation));
        } else {
          for (let i = 0; i < locations.length; i += 5) {
            await Promise.all(locations.slice(i, i + 5).map(processLocation));
          }
        }

        emit("reviews_complete", { totalReviews });

        // Wait for preliminary merge to finish before final merge
        if (preliminaryMergePromise) await preliminaryMergePromise;

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
