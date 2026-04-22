import Anthropic from "@anthropic-ai/sdk";
import { fetchApifyReviews } from "@/lib/apify-reviews";

export const maxDuration = 300;

const anthropic = new Anthropic();

// Minimal Haiku prompt — same shape as production but trimmed for the test harness
const HAIKU_SYSTEM_PROMPT = `You are a hospitality industry analyst categorizing guest reviews.

For each review, return a JSON object with:
1. "categories": array of { "id": CATEGORY_ID, "sentiment": "positive"|"negative"|"mixed", "evidence": "verbatim quote", "pillars": [pillar IDs] }
2. "severity": 1-5
3. "is_recurring_signal": boolean
4. "turnover_signal": boolean

Categories:
TIER 1: SVC_CONSISTENCY (P1,P2), STAFF_KNOWLEDGE (P1,P3), STAFF_ATTITUDE (P4,P1), WAIT_TIMES (P2,P3), COMMUNICATION (P2), ONBOARDING_SIGNALS (P1), MULTI_LOCATION (P2,P1), MGMT_RESPONSE (P3,P2), BOTTLENECK_SIGNALS (P3)
TIER 2: FOOD_QUALITY, AMBIANCE, VALUE, BOOKING

Pillars:
- P1: Turnover
- P2: Communication
- P3: Bottleneck
- P4: Engagement

Return valid JSON array, one object per review:
[{"review_id": "string", "categories": [...], "severity": 1-5, "is_recurring_signal": bool, "turnover_signal": bool}]`;

interface TestReview {
  review_id: string;
  rating: number;
  text: string;
}

async function classifyBatch(reviews: TestReview[]): Promise<number> {
  const reviewsText = reviews
    .map((r) => `ID: ${r.review_id} | Rating: ${r.rating}/5\n${r.text}`)
    .join("\n---\n");

  const start = Date.now();
  await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: [{ type: "text", text: HAIKU_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: reviewsText }],
  });
  return Date.now() - start;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(request: Request) {
  try {
    const { placeId, batchSize } = await request.json();
    if (!placeId || !batchSize) {
      return Response.json({ error: "placeId and batchSize required" }, { status: 400 });
    }

    // Fetch a realistic sample (200 reviews matches production newest fetch)
    const apifyStart = Date.now();
    const apifyReviews = await fetchApifyReviews([placeId], 200, "newest", 60);
    const apifyMs = Date.now() - apifyStart;

    const reviews: TestReview[] = apifyReviews
      .filter((r) => r.text && r.text.trim().length > 0)
      .map((r, i) => ({
        review_id: `r${i}`,
        rating: r.stars,
        text: r.text,
      }));

    if (reviews.length === 0) {
      return Response.json({ error: "No reviews with text found" }, { status: 400 });
    }

    // Special case: batchSize === 'N' means single call with all reviews
    const effectiveBatchSize = batchSize === "N" ? reviews.length : Number(batchSize);
    const batches = chunk(reviews, effectiveBatchSize);

    // Run all batches in parallel
    const totalStart = Date.now();
    const batchTimings = await Promise.all(batches.map((b) => classifyBatch(b)));
    const totalMs = Date.now() - totalStart;

    return Response.json({
      placeId,
      batchSize: effectiveBatchSize,
      reviewsTotal: reviews.length,
      batchCount: batches.length,
      apifyMs,
      totalHaikuMs: totalMs,
      slowestBatchMs: Math.max(...batchTimings),
      fastestBatchMs: Math.min(...batchTimings),
      avgBatchMs: Math.round(batchTimings.reduce((s, t) => s + t, 0) / batchTimings.length),
      batchTimingsMs: batchTimings,
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
