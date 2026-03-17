import Anthropic from "@anthropic-ai/sdk";
import { fetchOutscraperReviews } from "@/lib/outscraper";
import { getPlaceDetails } from "@/lib/google-places";
import type { PlaceSummary, StaffAnalysis, StaffMention } from "@/lib/types";

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

const PER_LOCATION_PROMPT = `Analyze these customer reviews for ONE location. Find mentions of staff, employees, and service quality.

Extract ONLY staff/service-related reviews. Skip reviews about food, decor, prices with no staff mention.

Return valid JSON:
{
  "mentions": [
    {
      "reviewAuthor": string,
      "reviewText": string (full text),
      "reviewRating": number (1-5),
      "reviewDate": string,
      "sentiment": "positive" | "negative",
      "staffNames": string[] (employee first names, empty if generic like "the waiter"),
      "relevantExcerpt": string (the specific sentence about staff),
      "locationName": string
    }
  ],
  "namedEmployees": string[],
  "positiveCount": number,
  "negativeCount": number,
  "totalReviewsAnalyzed": number
}

Reviews:
`;

const MERGE_PROMPT = `You have staff analysis summaries from multiple locations of the same business. Create a unified headline and body.

Rules:
- headline: Max 12 words, punchy, action-oriented. Frame around the best-mentioned employee name if one exists (e.g. "Make every shift feel like Sarah's"). Never generic.
- body: 2-3 sentences. Connect findings to the business opportunity — great staff = standard to replicate, complaints = training gap. Actionable and solvable.
- standoutEmployee: Most positively mentioned employee name, or null.

Return valid JSON:
{
  "headline": string,
  "body": string,
  "standoutEmployee": string | null
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
  mentions: StaffMention[];
  namedEmployees: string[];
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
      mentions: (parsed.mentions ?? []).map((m: StaffMention) => ({
        reviewAuthor: m.reviewAuthor ?? "",
        reviewText: m.reviewText ?? "",
        reviewRating: m.reviewRating ?? 0,
        reviewDate: m.reviewDate ?? "",
        sentiment: m.sentiment ?? "positive",
        staffNames: m.staffNames ?? [],
        relevantExcerpt: m.relevantExcerpt ?? "",
        locationName: m.locationName ?? "",
      })),
      namedEmployees: parsed.namedEmployees ?? [],
      positiveCount: parsed.positiveCount ?? 0,
      negativeCount: parsed.negativeCount ?? 0,
      totalReviewsAnalyzed: parsed.totalReviewsAnalyzed ?? reviews.length,
    };
  } catch {
    return null;
  }
}

async function runMerge(mentions: StaffMention[]): Promise<{
  headline: string;
  body: string;
  standoutEmployee: string | null;
}> {
  const summaryText = mentions
    .map(
      (m) =>
        `[${m.sentiment.toUpperCase()}] ${m.locationName} — "${m.relevantExcerpt}" (staff: ${m.staffNames.join(", ") || "unnamed"})`
    )
    .join("\n");

  const mergeMessage = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
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
        standoutEmployee: parsed.standoutEmployee ?? null,
      };
    } catch {
      // fall through
    }
  }
  return { headline: "", body: "", standoutEmployee: null };
}

// The 3 Outscraper calls we fire per location, independently
const REVIEW_FETCHES_FULL: { limit: number; sort: "newest" | "lowest_rating" | "highest_rating" }[] = [
  { limit: 50, sort: "newest" },
  { limit: 25, sort: "lowest_rating" },
  { limit: 25, sort: "highest_rating" },
];

const REVIEW_FETCHES_LITE: { limit: number; sort: "newest" | "lowest_rating" | "highest_rating" }[] = [
  { limit: 20, sort: "newest" },
];

export async function POST(request: Request) {
  const url = new URL(request.url);
  const lite = url.searchParams.get("lite") === "1";

  const { locations: rawLocations } = (await request.json()) as {
    locations: PlaceSummary[];
  };

  // In lite mode, cap locations to 3
  const locations = lite ? rawLocations.slice(0, 3) : rawLocations;

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

        const allMentions: StaffMention[] = [];
        const allNamedEmployees: string[] = [];
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
                  detail: `${batch.length} reviews → ${result?.mentions.length ?? 0} mentions (${sort})`,
                  parent: `outscraper_${loc.placeId}_${sort}`,
                });

                if (result && result.mentions.length > 0) {
                  allMentions.push(...result.mentions);
                  allNamedEmployees.push(...result.namedEmployees);
                  totalPositive += result.positiveCount;
                  totalNegative += result.negativeCount;
                  totalReviews += result.totalReviewsAnalyzed;

                  emit("batch_analysis", {
                    placeId: loc.placeId,
                    displayName: loc.displayName,
                    batchIndex: idx,
                    mentions: result.mentions,
                    namedEmployees: result.namedEmployees,
                  });

                  // Fire preliminary merge as soon as we have first mentions (skip in lite)
                  if (!lite && !preliminaryMergeFired && allMentions.length > 0) {
                    preliminaryMergeFired = true;
                    const snapshot = [...allMentions];
                    const prelimStart = ts();
                    preliminaryMergePromise = runMerge(snapshot).then((merged) => {
                      emit("timing", {
                        id: "preliminary_merge",
                        label: "Preliminary merge (Haiku)",
                        startMs: prelimStart,
                        endMs: ts(),
                        detail: `${snapshot.length} mentions`,
                      });
                      const prelimAnalysis: StaffAnalysis = {
                        ...merged,
                        mentions: snapshot,
                        totalReviewsAnalyzed: totalReviews,
                        positiveCount: snapshot.filter((m) => m.sentiment === "positive").length,
                        negativeCount: snapshot.filter((m) => m.sentiment === "negative").length,
                        namedEmployees: [...new Set(snapshot.flatMap((m) => m.staffNames))],
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
                const place = await fetchOutscraperReviews(loc.placeId, limit, sort);

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

        // Final merge with ALL mentions
        let staffAnalysis: StaffAnalysis | null = null;

        if (allMentions.length > 0) {
          emit("analyzing", {});
          const mergeStart = ts();
          const merged = await runMerge(allMentions);
          emit("timing", {
            id: "final_merge",
            label: "Final merge (Haiku)",
            startMs: mergeStart,
            endMs: ts(),
            detail: `${allMentions.length} mentions`,
          });

          const dedupedEmployees = [...new Set(allNamedEmployees)];

          staffAnalysis = {
            ...merged,
            mentions: allMentions,
            totalReviewsAnalyzed: totalReviews,
            positiveCount: totalPositive,
            negativeCount: totalNegative,
            namedEmployees: dedupedEmployees,
          };

          emit("analysis", staffAnalysis);
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
          detail: `${locations.length} locations, ${totalReviews} reviews, ${allMentions.length} mentions`,
        });

        emit("done", {
          place: locations[0],
          locations,
          locationDetails,
          staffAnalysis,
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
