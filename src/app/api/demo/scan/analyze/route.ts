import Anthropic from "@anthropic-ai/sdk";
import { fetchApifyReviews, mapSort, type ApifyReview } from "@/lib/apify-reviews";
import { getPlaceDetails } from "@/lib/google-places";
import type {
  PlaceSummary,
  CategorizedReview,
  ReportCategoryId,
  PillarId,
  ReportAggregates,
  GuestFeedbackReport,
  ReviewAnalysis,
  ReviewInsight,
  CategoryBreakdown,
} from "@/lib/types";

export const maxDuration = 300;

const anthropic = new Anthropic();

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ── Category Taxonomy ──────────────────────────────────────────────────

interface CategoryDef {
  id: ReportCategoryId;
  label: string;
  module: string;
  tier: 1 | 2;
  pillars: PillarId[];
  keywords: RegExp;
}

const CATEGORIES: CategoryDef[] = [
  // Tier 1: AG-addressable
  {
    id: "SVC_CONSISTENCY", label: "Service Consistency", module: "LMS + Handbooks/SOPs", tier: 1,
    pillars: ["P1", "P2"],
    keywords: /inconsisten|hit.or.miss|depends.who|last.time.was|used.to.be|varies|varying|standards|not.the.same|gone.downhill|some.days|sometimes.great/i,
  },
  {
    id: "STAFF_KNOWLEDGE", label: "Staff Knowledge & Competence", module: "LMS (Training)", tier: 1,
    pillars: ["P1", "P3"],
    keywords: /recommend|suggestion|explained|wrong.order|mix.up|mixed.up|mistake|forgot|forgotten|confused|knew|knowledge|trained|inexperienced|didn't.know|couldn't.answer|couldn't.tell|menu/i,
  },
  {
    id: "STAFF_ATTITUDE", label: "Staff Attitude & Engagement", module: "Engagement & Recognition", tier: 1,
    pillars: ["P4", "P1"],
    keywords: /couldn't.care|no.enthusiasm|disengaged|indifferent|bother|attitude|rude|unfriendly|friendly|welcoming|attentive|ignored|helpful|polite|impolite|smile|hospitality|felt.forgotten|couldn't.be.bothered/i,
  },
  {
    id: "WAIT_TIMES", label: "Wait Times & Speed of Service", module: "Operations & Scheduling", tier: 1,
    pillars: ["P2", "P3"],
    keywords: /slow|fast|quick|wait|waited|waiting|took.forever|prompt|speedy|efficient|long.time|ages|delay|hurry|minutes|flag.someone|forgotten.about/i,
  },
  {
    id: "COMMUNICATION", label: "Communication Failures", module: "Communications & Collaboration", tier: 1,
    pillars: ["P2"],
    keywords: /wrong.order|wrong.dish|lost.reservation|told.us|miscommunic|mix.up|never.came.back|different.from.what|not.what.we.ordered|didn't.pass|didn't.tell/i,
  },
  {
    id: "ONBOARDING_SIGNALS", label: "New Staff Signals", module: "LMS (Onboarding)", tier: 1,
    pillars: ["P1"],
    keywords: /clearly.new|hadn't.been.trained|first.day|new.staff|in.training|visibly.overwhelmed|learning|just.started|trainee/i,
  },
  {
    id: "MULTI_LOCATION", label: "Cross-Location Inconsistency", module: "All (esp. Handbooks, LMS)", tier: 1,
    pillars: ["P2", "P1"],
    keywords: /branch|other.location|other.restaurant|inconsistent|different.from|compared.to|original|flagship|standards.have/i,
  },
  {
    id: "MGMT_RESPONSE", label: "Management Response Quality", module: "Communications + AI", tier: 1,
    pillars: ["P3", "P2"],
    keywords: /manager.didn't|manager.rushed|no.response|complaint|escalat|nothing.happened|manager.came|manager.apologised|handled.well|made.it.right/i,
  },
  {
    id: "BOTTLENECK_SIGNALS", label: "Manager Dependency", module: "Communications + AI", tier: 1,
    pillars: ["P3"],
    keywords: /wait.for.the.manager|check.with|had.to.ask|nobody.could.help|without.checking|kept.disappearing|defer|couldn't.decide|need.permission/i,
  },
  // Tier 2: General
  {
    id: "FOOD_QUALITY", label: "Food Quality", module: "", tier: 2,
    pillars: [],
    keywords: /food|taste|tasted|dish|meal|flavour|flavor|fresh|stale|cold|hot|overcooked|undercooked|portion|delicious|amazing.food|terrible.food|presentation/i,
  },
  {
    id: "AMBIANCE", label: "Ambiance & Environment", module: "", tier: 2,
    pillars: [],
    keywords: /ambiance|atmosphere|decor|noise|noisy|loud|quiet|cozy|lighting|music|clean|dirty|hygiene|toilet|bathroom|interior|beautiful.space|lovely.setting/i,
  },
  {
    id: "VALUE", label: "Value for Money", module: "", tier: 2,
    pillars: [],
    keywords: /price|expensive|cheap|value|worth|overpriced|reasonable|pricey|bargain|cost|bill|afford/i,
  },
  {
    id: "BOOKING", label: "Booking & Reservations", module: "", tier: 2,
    pillars: [],
    keywords: /book|reserv|walk.in|table.available|couldn't.get|fully.booked|online.booking|no.shows/i,
  },
];

const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.id, c]));

const PILLAR_LABELS: Record<PillarId, string> = {
  P1: "Staff Retention & Readiness",
  P2: "Information Flow & Coordination",
  P3: "Decision Autonomy & Speed",
  P4: "Team Engagement & Energy",
};

// ── Haiku System Prompt (cached across all batches) ────────────────────

const HAIKU_SYSTEM_PROMPT = `You are a hospitality industry analyst categorizing guest reviews for a restaurant.

For each review, return a JSON object with:
1. "categories": array of category objects, each with:
   - "id": one of the category IDs from the taxonomy below
   - "sentiment": "positive" | "negative" | "mixed"
   - "evidence": the specific phrase(s) from the review supporting this tag (verbatim quote, max 30 words)
   - "pillars": array of pillar IDs this category ladders to (from the mapping below)
2. "severity": 1-5 scale (1 = minor gripe, 5 = likely lost customer permanently)
3. "is_recurring_signal": boolean — does this review reference a pattern? ("always", "every time", "again", etc.)
4. "turnover_signal": boolean — does this review contain evidence suggesting staff turnover impact?
   (e.g., mentions of new staff, different staff every visit, clearly untrained, high variability)

Rules:
- A single review can have multiple categories
- Only tag categories where there is clear textual evidence
- Do NOT infer categories that aren't supported by the text
- Preserve original language in evidence quotes (including typos)
- Be especially attentive to IMPLICIT turnover signals: reviews that say "service has gone downhill" or "not the same as it used to be" or "inconsistent depending on who's working" are often turnover symptoms
- Flag BOTTLENECK signals: any review where staff defer to a manager, can't answer questions independently, or guests wait for decisions

Pillar IDs:
- P1: Turnover (staff churn, onboarding, knowledge gaps, inconsistency from new hires)
- P2: Communication (information not flowing, coordination failures, visibility gaps)
- P3: Bottleneck (manager dependency, staff can't self-serve answers, decision delays)
- P4: Engagement (disengaged attitudes, low energy, tool adoption symptoms)

Category Taxonomy:

TIER 1 (AG-addressable):
| ID | Label | Pillars |
|---|---|---|
| SVC_CONSISTENCY | Service Consistency | P1, P2 |
| STAFF_KNOWLEDGE | Staff Knowledge & Competence | P1, P3 |
| STAFF_ATTITUDE | Staff Attitude & Engagement | P4, P1 |
| WAIT_TIMES | Wait Times & Speed of Service | P2, P3 |
| COMMUNICATION | Communication Failures | P2 |
| ONBOARDING_SIGNALS | New Staff Signals | P1 |
| MULTI_LOCATION | Cross-Location Inconsistency | P2, P1 |
| MGMT_RESPONSE | Management Response Quality | P3, P2 |
| BOTTLENECK_SIGNALS | Manager Dependency | P3 |

TIER 2 (General — for credibility, not AG-addressable):
| ID | Label |
|---|---|
| FOOD_QUALITY | Food Quality |
| AMBIANCE | Ambiance & Environment |
| VALUE | Value for Money |
| BOOKING | Booking & Reservations |

Return valid JSON. ALWAYS wrap your response in an array, even for a single review:
[
  {
    "review_id": "string (use the ID provided)",
    "categories": [
      { "id": "CATEGORY_ID", "sentiment": "positive|negative|mixed", "evidence": "verbatim quote", "pillars": ["P1"] }
    ],
    "severity": 1-5,
    "is_recurring_signal": boolean,
    "turnover_signal": boolean
  }
]

CRITICAL: Even if you receive only ONE review, return an array with one object: [{...}]. Never return a bare object.`;

// ── Sonnet System Prompt ───────────────────────────────────────────────

const SONNET_SYSTEM_PROMPT = `You are a senior hospitality industry analyst producing an independent Guest Feedback Intelligence Report. You have deep expertise in restaurant operations, service design, and the academic research linking employee experience to guest satisfaction.

YOUR ROLE:
- You are an objective, third-party analyst — NOT a vendor or salesperson
- Your tone is measured, evidence-based, and professional
- You cite academic research naturally, the way a consulting report would
- You are constructive, not alarmist — you identify opportunities, not failures
- You acknowledge strengths genuinely before addressing gaps

OUTPUT FORMAT: Return valid JSON matching this schema exactly:
{
  "executive_summary": "string (150-200 words, authoritative overview)",
  "strengths": [
    { "title": "string", "commentary": "string (2-3 sentences with research)", "quotes": [{ "text": "verbatim quote", "rating": 5, "date": "string" }] }
  ],
  "findings": [
    {
      "title": "Descriptive finding title",
      "category_id": "CATEGORY_ID",
      "pattern": "2-3 sentences describing the pattern naturally — state what guests experienced, with numbers. Do NOT reference category IDs or labels.",
      "quotes": [{ "text": "verbatim quote", "rating": 2, "date": "string", "reviewer_name": "string" }],
      "root_cause": "3-layer connection: guest complaint → staff behaviour → operational gap. Cite research.",
      "impact": "What this costs the business. Cite research.",
      "how_addressed": "Describe the intervention MECHANISM — how the operational gap is closed. Be specific about what the solution does functionally, without naming any vendor.",
      "current_vs_desired": [{ "current": "description", "desired": "description" }]
    }
  ],
  "trend_analysis": "string (1-2 paragraphs on trajectory)",
  "recommendations": [
    { "priority": 1, "title": "string", "description": "string", "category_ids": ["CATEGORY_ID"], "pillar_ids": ["P1"] }
  ],
  "methodology": "string (brief paragraph)"
}

RULES:
1. Every claim must be supported by direct review evidence (verbatim quotes) or cited research
2. Select 3-6 most significant findings based on frequency, severity, and recurrence — do NOT cover every category
3. In "Guest Voice" / quotes: use ONLY exact quotes from the provided reviews — never fabricate
4. Root Cause Analysis: connect surface symptoms → staff behaviour → operational gap (three layers). Cite specific research.
5. "how_addressed" describes solution CATEGORIES (e.g., "structured mobile training"), not specific products. Never name a vendor.
6. Strengths must be genuine — frame as assets worth protecting
7. Write in British English
8. Finding prioritisation: frequency → severity → recurrence → trend. NOT sales relevance.
9. If most significant theme is food quality (not AG-addressable), it should still be #1 finding. Credibility depends on letting the data lead.

ACADEMIC REFERENCES available to you:
- Luca (2016): 1-star increase → 5-9% revenue increase for independent restaurants
- Anderson & Magruder (2012): half-star increase = 19% greater likelihood of full tables at peak
- Cornell Center for Hospitality Research: 1pp turnover increase → ~5% satisfaction decline
- Hinkin & Tracey (2000): Turnover costs $5,864/£4,600 per frontline hospitality employee
- Heskett et al. (1994): Service-Profit Chain — employee satisfaction → service quality → customer satisfaction → profitability
- Technomic (2023): 63% of top-performing chains use centralised training
- Stamolampros et al. (2019): 1-unit job satisfaction increase → 1.2-1.4 ROA increase
- Glassdoor/SHRM (2022): Structured onboarding → 82% higher retention, 70% productivity increase
- Ji et al. (2024): Repeat customers highly sensitive to quality variations across visits
- "Smooth or Sticky?" (2025): When mean quality is high, variability reduces perceived quality more than consistently lower baseline

EDGE CASES:
- report_type "preliminary" (<20 reviews): executive_summary + strengths only, empty findings/recommendations
- average_rating >= 4.8: lead with praise, findings become "micro-opportunities to protect excellence"
- average_rating < 3.0: empathetic framing, focus on "highest-impact opportunities"`;

// ── Helpers ────────────────────────────────────────────────────────────

interface ReviewForAnalysis {
  review_id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  locationName: string;
  responseFromOwner: string | null;
  source: "newest" | "lowest";
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

/**
 * Sample max 8 locations: primary + highest-reviewed + lowest-reviewed + geographically diverse.
 */
function sampleLocations(locations: PlaceSummary[]): { sampled: PlaceSummary[]; total: number } {
  const total = locations.length;
  if (total <= 8) return { sampled: locations, total };

  const primary = locations[0];
  const sorted = [...locations.slice(1)].sort((a, b) => (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0));
  const highestReviewed = sorted[0];
  const lowestRated = [...locations.slice(1)].sort((a, b) => (a.rating ?? 5) - (b.rating ?? 5))[0];

  const picked = new Set([primary.placeId, highestReviewed?.placeId, lowestRated?.placeId].filter(Boolean));
  const remaining = locations.filter((l) => !picked.has(l.placeId));

  // Fill to 8 with geographically diverse (max distance from centroid)
  const centLat = locations.reduce((s, l) => s + l.location.lat, 0) / total;
  const centLng = locations.reduce((s, l) => s + l.location.lng, 0) / total;
  remaining.sort((a, b) => {
    const da = Math.sqrt((a.location.lat - centLat) ** 2 + (a.location.lng - centLng) ** 2);
    const db = Math.sqrt((b.location.lat - centLat) ** 2 + (b.location.lng - centLng) ** 2);
    return db - da;
  });

  const sampled = [primary, highestReviewed, lowestRated].filter(Boolean) as PlaceSummary[];
  for (const loc of remaining) {
    if (sampled.length >= 8) break;
    sampled.push(loc);
  }

  return { sampled, total };
}

// ── Haiku Classification ───────────────────────────────────────────────

async function classifyBatch(
  reviews: ReviewForAnalysis[],
  skipTier2: boolean,
): Promise<CategorizedReview[]> {
  const reviewsText = reviews
    .map((r) => `ID: ${r.review_id} | Location: ${r.locationName} | Rating: ${r.rating}/5 | Date: ${r.date}\n${r.text}`)
    .join("\n---\n");

  const systemText = skipTier2
    ? HAIKU_SYSTEM_PROMPT + "\n\nIMPORTANT: Only tag Tier 1 categories. Skip Tier 2 (FOOD_QUALITY, AMBIANCE, VALUE, BOOKING)."
    : HAIKU_SYSTEM_PROMPT;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: reviewsText }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  // Strip markdown fences
  let cleanText = text;
  const fenceMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleanText = fenceMatch[1].trim();

  // Try parsing as array first, then as single object (single-review batches)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let parsed: any[] | null = null;

  // Try array
  const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      parsed = JSON.parse(arrayMatch[0]);
    } catch { /* fall through */ }
  }

  // Try single object — wrap in array
  if (!parsed) {
    const objectMatch = cleanText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        const obj = JSON.parse(objectMatch[0]);
        parsed = [obj];
      } catch { /* fall through */ }
    }
  }

  if (!parsed) {
    console.error("[Haiku] Could not parse output. Raw (first 500):", text.slice(0, 500));
    return [];
  }

  try {
    const reviewMap = new Map(reviews.map((r) => [r.review_id, r]));

    return parsed.map((item) => {
      const source = reviewMap.get(item.review_id);
      return {
        review_id: item.review_id ?? "",
        text: source?.text ?? "",
        rating: source?.rating ?? 0,
        date: source?.date ?? "",
        reviewer_name: source?.author ?? "",
        response_from_owner: source?.responseFromOwner ?? null,
        categories: (item.categories ?? []).map((c: any) => ({
          id: c.id ?? "FOOD_QUALITY",
          sentiment: c.sentiment ?? "mixed",
          evidence: c.evidence ?? "",
          pillars: c.pillars ?? [],
        })),
        severity: item.severity ?? 3,
        is_recurring_signal: item.is_recurring_signal ?? false,
        turnover_signal: item.turnover_signal ?? false,
      };
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
  } catch (parseErr) {
    console.error("[Haiku] JSON parse failed:", parseErr, "\nRaw (first 500):", text.slice(0, 500));
    return [];
  }
}

// ── Aggregation (pure TypeScript) ──────────────────────────────────────

function computeAggregates(
  categorized: CategorizedReview[],
  allReviews: ReviewForAnalysis[],
  overallLifetimeRating: number,
): ReportAggregates {
  // Category summary
  const catSummary: ReportAggregates["category_summary"] = {};
  for (const review of categorized) {
    for (const cat of review.categories) {
      if (!catSummary[cat.id]) catSummary[cat.id] = { total: 0, negative: 0, mixed: 0, positive: 0, avg_severity: 0 };
      const entry = catSummary[cat.id];
      entry.total++;
      entry[cat.sentiment]++;
    }
  }
  // Compute avg severity per category
  for (const [catId, entry] of Object.entries(catSummary)) {
    const reviews = categorized.filter((r) => r.categories.some((c) => c.id === catId));
    entry.avg_severity = reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.severity, 0) / reviews.length) * 10) / 10
      : 0;
  }

  // Pillar summary
  const totalNegative = categorized.filter((r) => r.categories.some((c) => c.sentiment === "negative")).length;
  const pillarSummary: ReportAggregates["pillar_summary"] = {};
  for (const pillarId of ["P1", "P2", "P3", "P4"] as PillarId[]) {
    const impacted = categorized.filter((r) =>
      r.categories.some((c) => c.pillars.includes(pillarId))
    );
    const negImpacted = impacted.filter((r) =>
      r.categories.some((c) => c.pillars.includes(pillarId) && c.sentiment === "negative")
    );
    const catCounts = new Map<string, number>();
    for (const r of impacted) {
      for (const c of r.categories) {
        if (c.pillars.includes(pillarId)) {
          catCounts.set(c.id, (catCounts.get(c.id) ?? 0) + 1);
        }
      }
    }
    const topCats = [...catCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);

    pillarSummary[pillarId] = {
      reviews_impacted: impacted.length,
      pct_of_negative: totalNegative > 0 ? Math.round((negImpacted.length / totalNegative) * 100) / 100 : 0,
      top_categories: topCats,
    };
  }

  // Trend: average of ONLY the newest-sourced reviews vs the lifetime Google Places rating
  // (the lowest-sourced reviews would skew this artificially negative)
  const newestReviews = allReviews.filter((r) => r.source === "newest");
  const recentAvg = newestReviews.length > 0
    ? Math.round((newestReviews.reduce((s, r) => s + r.rating, 0) / newestReviews.length) * 10) / 10
    : 0;
  const recentSampleSize = newestReviews.length;

  const direction: ReportAggregates["trend"]["direction"] =
    recentAvg > overallLifetimeRating + 0.2 ? "improving"
    : recentAvg < overallLifetimeRating - 0.2 ? "declining"
    : "stable";

  // Owner response rate
  const withResponse = allReviews.filter((r) => r.responseFromOwner && r.responseFromOwner.trim().length > 0).length;
  const responseRate = allReviews.length > 0 ? Math.round((withResponse / allReviews.length) * 100) / 100 : 0;

  // Turnover signals
  const turnoverCount = categorized.filter((r) => r.turnover_signal).length;

  return {
    category_summary: catSummary,
    pillar_summary: pillarSummary,
    trend: {
      recent_sample_avg: recentAvg,
      overall_lifetime_avg: overallLifetimeRating,
      sample_size: recentSampleSize,
      direction,
    },
    owner_response_rate: responseRate,
    turnover_signal_count: turnoverCount,
  };
}

// ── Pre-computed templates ─────────────────────────────────────────────

const CURRENT_DESIRED: Partial<Record<ReportCategoryId, { current: string; desired: string }[]>> = {
  WAIT_TIMES: [
    { current: "Service coordination relies on verbal handoffs that break down under pressure", desired: "Real-time digital coordination visible to all team members" },
    { current: "No standardised peak-period protocols; each shift improvises", desired: "Documented, accessible service procedures reinforced through training" },
  ],
  STAFF_KNOWLEDGE: [
    { current: "Product knowledge depends on individual experience and memory", desired: "Centralised, searchable knowledge base accessible on any device" },
    { current: "Training is informal and inconsistent across team members", desired: "Structured learning paths with completion tracking and verification" },
  ],
  STAFF_ATTITUDE: [
    { current: "No structured feedback or recognition for positive service delivery", desired: "Team recognition programmes with real-time engagement tracking" },
    { current: "Engagement measured reactively via guest complaints", desired: "Proactive pulse surveys and engagement scoring" },
  ],
  SVC_CONSISTENCY: [
    { current: "Service quality depends on which staff are working", desired: "Standardised procedures that deliver consistent experience regardless of team composition" },
    { current: "No mechanism to identify and address consistency gaps across shifts", desired: "Operational patterns visible before they impact guests" },
  ],
  COMMUNICATION: [
    { current: "FOH/BOH coordination relies on verbal handoffs and memory", desired: "Structured team communication channels replacing ad-hoc messaging" },
    { current: "Information siloed between shifts and departments", desired: "Shared digital workspace visible to all team members in real-time" },
  ],
  ONBOARDING_SIGNALS: [
    { current: "New staff learn informally through observation", desired: "Structured onboarding journeys with confidence-building milestones" },
    { current: "Time-to-competence varies widely and is unmeasured", desired: "Tracked onboarding completion with knowledge verification" },
  ],
  MULTI_LOCATION: [
    { current: "Each location develops its own procedures and standards", desired: "Centralised training, SOPs, and communication across all sites" },
    { current: "No visibility into cross-location performance variance", desired: "Standardised metrics and benchmarking across locations" },
  ],
  MGMT_RESPONSE: [
    { current: "Complaint handling depends on individual manager availability", desired: "Documented escalation protocols accessible to all team members" },
    { current: "No systematic review of guest feedback patterns", desired: "Automated feedback analysis surfacing trends before they compound" },
  ],
  BOTTLENECK_SIGNALS: [
    { current: "Staff unable to answer questions independently; defer everything to manager", desired: "Self-serve knowledge access via AI-powered search and reference materials" },
    { current: "Manager acts as sole decision hub", desired: "Team members empowered with information and authority for routine decisions" },
  ],
  FOOD_QUALITY: [
    { current: "Quality variation across dishes, shifts, and days", desired: "Standardised preparation procedures with consistency checks" },
  ],
  AMBIANCE: [
    { current: "Environment maintenance is ad-hoc", desired: "Scheduled operational checklists for cleanliness and ambiance" },
  ],
  VALUE: [
    { current: "Pricing disconnected from perceived quality delivery", desired: "Service quality consistently matches or exceeds price point expectations" },
  ],
};

const INTERVENTION_MAP: Partial<Record<ReportCategoryId, { title: string; description: string }>> = {
  WAIT_TIMES: { title: "Structured Peak-Period Coordination", description: "Implement real-time team communication and documented service protocols for high-traffic periods." },
  STAFF_KNOWLEDGE: { title: "Centralised Training & Knowledge Base", description: "Deploy structured learning paths with mobile-accessible reference materials and completion tracking." },
  STAFF_ATTITUDE: { title: "Team Engagement & Recognition Programme", description: "Introduce team recognition, pulse surveys, and engagement measurement to surface and address attitude issues proactively." },
  SVC_CONSISTENCY: { title: "Standardised Service Procedures", description: "Digitise and distribute SOPs ensuring consistent delivery regardless of team composition or shift." },
  COMMUNICATION: { title: "Structured Team Communications", description: "Replace ad-hoc messaging with dedicated team channels for real-time FOH/BOH coordination." },
  ONBOARDING_SIGNALS: { title: "Structured Onboarding Journeys", description: "Implement tracked onboarding paths with milestones, reducing time-to-competence and improving new hire confidence." },
  BOTTLENECK_SIGNALS: { title: "Self-Serve Knowledge Access", description: "Deploy AI-powered knowledge base so team members can answer questions independently without waiting for management." },
  MULTI_LOCATION: { title: "Cross-Location Standardisation", description: "Centralise training, SOPs, and communication across all sites to eliminate location-dependent quality variance." },
  MGMT_RESPONSE: { title: "Escalation Protocols & Feedback Analysis", description: "Document escalation procedures and automate feedback pattern detection to catch issues before they compound." },
};

// ── Skeleton builder (pure TypeScript) ─────────────────────────────────

interface FindingSkeleton {
  title: string;
  category_id: ReportCategoryId;
  pattern: string;
  quotes: { text: string; rating: number; date: string; reviewer_name: string }[];
  current_vs_desired: { current: string; desired: string }[];
}

interface StrengthSkeleton {
  title: string;
  quotes: { text: string; rating: number; date: string }[];
}

function buildSkeletons(categorized: CategorizedReview[], aggregates: ReportAggregates) {
  const catSummary = aggregates.category_summary;

  // Select finding categories: sort by (frequency × severity), filter by threshold
  const findingCandidates = Object.entries(catSummary)
    .map(([id, data]) => ({ id: id as ReportCategoryId, ...data, score: data.total * data.avg_severity }))
    .filter((c) => c.total >= 3 || c.avg_severity >= 3.5)
    .filter((c) => c.negative > 0 || c.mixed > 0) // must have at least some negative signal
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Build finding skeletons
  const findings: FindingSkeleton[] = findingCandidates.map((candidate) => {
    const catDef = CATEGORY_MAP.get(candidate.id);
    const relevantReviews = categorized
      .filter((r) => r.categories.some((c) => c.id === candidate.id && c.sentiment !== "positive"))
      .sort((a, b) => b.severity - a.severity);

    const quotes = relevantReviews.slice(0, 5).flatMap((r) =>
      r.categories
        .filter((c) => c.id === candidate.id)
        .map((c) => ({ text: c.evidence, rating: r.rating, date: r.date, reviewer_name: r.reviewer_name }))
    ).slice(0, 5);

    const recurringCount = relevantReviews.filter((r) => r.is_recurring_signal).length;
    const pattern = `${candidate.total} of ${categorized.length} analysed reviews flagged this theme, with an average severity of ${candidate.avg_severity}/5.` +
      (recurringCount > 0 ? ` ${recurringCount} reviews indicate a recurring pattern.` : '') +
      (candidate.negative > candidate.total * 0.7 ? ' The overwhelming majority of mentions are negative.' : '');

    return {
      title: `${catDef?.label ?? candidate.id} — ${candidate.negative} Negative Signals`,
      category_id: candidate.id,
      pattern,
      quotes,
      current_vs_desired: CURRENT_DESIRED[candidate.id] ?? [],
    };
  });

  // Build strength skeletons
  const strengthCandidates = Object.entries(catSummary)
    .filter(([, data]) => data.positive > data.negative)
    .sort(([, a], [, b]) => b.positive - a.positive)
    .slice(0, 3);

  const strengths: StrengthSkeleton[] = strengthCandidates.map(([id]) => {
    const catDef = CATEGORY_MAP.get(id as ReportCategoryId);
    const positiveReviews = categorized
      .filter((r) => r.categories.some((c) => c.id === id && c.sentiment === "positive"))
      .sort((a, b) => b.rating - a.rating);

    const quotes = positiveReviews.slice(0, 3).flatMap((r) =>
      r.categories
        .filter((c) => c.id === id && c.sentiment === "positive")
        .map((c) => ({ text: c.evidence, rating: r.rating, date: r.date }))
    ).slice(0, 3);

    return { title: catDef?.label ?? id, quotes };
  });

  // Build recommendation skeletons
  const recommendations = findings.slice(0, 4).map((f, i) => {
    const intervention = INTERVENTION_MAP[f.category_id];
    return {
      priority: i + 1,
      title: intervention?.title ?? f.title,
      category_ids: [f.category_id],
      pillar_ids: CATEGORY_MAP.get(f.category_id)?.pillars ?? [],
    };
  });

  return { findings, strengths, recommendations };
}

// ── Sonnet Report Generation (selector + parallel writers) ─────────────

const SELECTOR_PROMPT = `You pick which guest feedback themes deserve a deep finding write-up.

Given category aggregates, choose 2-3 themes that warrant findings based on:
- Frequency: how many reviews mention it
- Severity: average severity score
- Recurrence: how many reviews signal a pattern

Skip themes with fewer than 3 evidence items unless severity is extreme (>=4.5).
Prefer themes with clear operational fixes over generic complaints.
Let the data lead — if food quality dominates, pick it even though it's not staff-related.

Return valid JSON only:
{ "selected": ["CATEGORY_ID", "CATEGORY_ID"], "reason": "brief why these were picked" }`;

const FINDING_WRITER_PROMPT = `You are a hospitality operations advisor writing ONE finding for a guest feedback report. The reader is a small restaurant operator.

WRITING STYLE:
- Plain English. Short sentences. No academic jargon.
- Direct and actionable.
- Imagine you're sitting across from the ops manager over coffee.
- British English.

Write SHORT prose:
- title: short, direct (e.g., "Long waits during peak hours")
- pattern: 1-2 sentences. What guests are seeing, with the count (e.g., "12 reviews mention waits over 30 minutes").
- quotes: pick 3-5 verbatim quotes from the provided evidence
- root_cause: 2-3 sentences (~50 words). The likely operational reason. May include [1] footnote ref.
- impact: 1-2 sentences (~30 words). What this is costing them. May include [2] footnote ref.
- how_addressed: 2-3 sentences (~50 words). The kind of fix that works. No vendor names.
- citations_used: array of citation IDs you used (e.g. ["LUCA_2016"]). Empty array if none.

Return JSON only:
{
  "title": "string",
  "category_id": "string (use the value from the input)",
  "pattern": "string",
  "quotes": [{ "text": "string", "rating": 1-5, "date": "string", "reviewer_name": "string" }],
  "root_cause": "string",
  "impact": "string",
  "how_addressed": "string",
  "citations_used": ["citation IDs"]
}

CITATION LIBRARY (use only when directly relevant, not as decoration):
- LUCA_2016: Luca (2016), Harvard Business School — 1-star Yelp increase = 5-9% revenue increase
- ANDERSON_MAGRUDER_2012: Anderson & Magruder (2012), Economic Journal — half-star rating = 19% more full tables at peak
- HINKIN_TRACEY_2000: Hinkin & Tracey (2000), Cornell Hospitality Quarterly — turnover = £4,600 per frontline hire
- CORNELL_TURNOVER: Cornell research — 1 percentage point turnover increase = ~5% guest satisfaction drop
- SHRM_ONBOARDING: SHRM — structured onboarding = 82% higher retention
- HESKETT_1994: Heskett et al. (1994), Harvard Business Review — Service-Profit Chain (employee satisfaction → guest satisfaction)`;

const STRENGTHS_WRITER_PROMPT = `You are a hospitality operations advisor writing the strengths section of a guest feedback report. Plain English. Direct. No jargon.

Given positive guest evidence and category counts, identify the top 3 themes guests love and write each as:
- title: short, descriptive (e.g., "Great food", "Genuine warmth from staff"). Avoid stuffy phrases like "Strong Culinary Identity".
- commentary: 1-2 sentences. What guests love and why it matters.

Return JSON only:
{
  "strength_titles": ["string", "string", "string"],
  "strength_commentaries": ["string", "string", "string"]
}

British English. Conversational but professional.`;

const RECOMMENDATIONS_WRITER_PROMPT = `You are a hospitality operations advisor writing 2-3 recommendations for a guest feedback report. Plain English. Direct. No jargon.

You'll receive the finding category labels that the analyst selected. Write 2-3 prioritised actions that address those gaps. Each:
- priority: 1, 2, 3
- title: short action title (e.g., "Set up a peak-hour service playbook")
- description: 1-2 sentences. What to do in plain terms.
- category_ids: array of category IDs the recommendation addresses
- pillar_ids: array of pillar IDs (P1, P2, P3, P4) the recommendation maps to

Return JSON only:
{
  "recommendations": [
    { "priority": 1, "title": "string", "description": "string", "category_ids": ["string"], "pillar_ids": ["string"] }
  ]
}

British English. Concrete and actionable.`;

const EXEC_SUMMARY_WRITER_PROMPT = `You are a hospitality operations advisor writing the top-of-report summary. Plain English. Direct. No academic jargon.

Given quantitative data and the finding category labels picked by the analyst, write:

1. "executive_summary": 80-100 words. What's working, what isn't, what to focus on. Plain language.
2. "trend_analysis": 2-3 sentences on how things are trending. Reference the rating trend.
3. "methodology": 3-4 sentences describing the analysis process. Cover: how many reviews were collected, from which sources and sort orders (newest + lowest-rated), the two-stage classification process (AI categorisation into 13 themed categories across 4 operational pillars, then pattern detection), how findings were selected (frequency, severity, recurrence), and that quotes are verbatim from public Google reviews. End with the analysis date.

Return JSON only:
{
  "executive_summary": "string",
  "trend_analysis": "string",
  "methodology": "string"
}

British English. Conversational but professional. NO research citations here.`;

const CITATION_DEFINITIONS: Record<string, { source: string; finding: string }> = {
  LUCA_2016: { source: "Luca (2016), Harvard Business School", finding: "1-star Yelp increase = 5-9% revenue increase" },
  ANDERSON_MAGRUDER_2012: { source: "Anderson & Magruder (2012), Economic Journal", finding: "Half-star rating = 19% more full tables at peak" },
  HINKIN_TRACEY_2000: { source: "Hinkin & Tracey (2000), Cornell Hospitality Quarterly", finding: "Turnover costs ~£4,600 per frontline hire" },
  CORNELL_TURNOVER: { source: "Cornell Center for Hospitality Research", finding: "1pp turnover increase ≈ 5% satisfaction drop" },
  SHRM_ONBOARDING: { source: "SHRM", finding: "Structured onboarding = 82% higher retention" },
  HESKETT_1994: { source: "Heskett et al. (1994), Harvard Business Review", finding: "Service-Profit Chain: employee satisfaction → guest satisfaction" },
};

function parseSonnetJSON(rawText: string, emit?: (event: string, data: unknown) => void): Record<string, unknown> | null {
  let text = rawText;

  // Strip markdown code fences
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();

  // Try direct parse first (most reliable)
  try {
    return JSON.parse(text);
  } catch { /* fall through */ }

  // Find the outermost balanced JSON object
  const start = text.indexOf('{');
  if (start !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(start, i + 1);
          try {
            return JSON.parse(candidate);
          } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            emit?.("log", { message: `⚠️ JSON parse failed at char ${i}: ${errMsg}. Trying truncated...`, level: "error" });
            // Try to salvage by looking for common issues
            console.error("[Sonnet] Parse failed:", errMsg, "\nCandidate (first 2000):", candidate.slice(0, 2000));
            break;
          }
        }
      }
    }
  }

  emit?.("log", { message: `❌ Could not parse Sonnet output (${rawText.length} chars). First 500: ${rawText.slice(0, 500)}`, level: "error" });
  console.error("[Sonnet] No parseable JSON. Raw (first 2000):", rawText.slice(0, 2000));
  return null;
}

type ReportResult = Omit<GuestFeedbackReport, "quantitative_overview" | "metadata" | "categorized_reviews" | "aggregates"> & { _debug?: Record<string, unknown> };

interface EvidenceItem {
  evidence: string;
  rating: number;
  date: string;
  reviewer_name: string;
  severity: number;
  is_recurring: boolean;
  turnover_signal: boolean;
}

function groupNegativeEvidence(categorized: CategorizedReview[]): Record<string, EvidenceItem[]> {
  const groups: Record<string, EvidenceItem[]> = {};
  for (const review of categorized) {
    if (review.rating > 2) continue; // only sub-3-star
    for (const cat of review.categories) {
      if (cat.sentiment === "positive") continue;
      if (!groups[cat.id]) groups[cat.id] = [];
      groups[cat.id].push({
        evidence: cat.evidence,
        rating: review.rating,
        date: review.date,
        reviewer_name: review.reviewer_name,
        severity: review.severity,
        is_recurring: review.is_recurring_signal,
        turnover_signal: review.turnover_signal,
      });
    }
  }
  return groups;
}

function samplePositiveEvidence(categorized: CategorizedReview[], max = 15): { evidence: string; rating: number; category: string }[] {
  const positives: { evidence: string; rating: number; category: string }[] = [];
  for (const review of categorized) {
    if (review.rating < 4) continue;
    for (const cat of review.categories) {
      if (cat.sentiment === "positive") {
        positives.push({ evidence: cat.evidence, rating: review.rating, category: cat.id });
      }
    }
  }
  // Dedupe by evidence text, take top N
  const seen = new Set<string>();
  return positives.filter((p) => {
    if (seen.has(p.evidence)) return false;
    seen.add(p.evidence);
    return true;
  }).slice(0, max);
}

// ── Stage 1: Selector (Haiku) ──────────────────────────────────────────

async function selectFindingCategories(
  businessName: string,
  cappedEvidence: Record<string, { category_id: string; items: EvidenceItem[]; total_in_category: number }>,
  emit: (event: string, data: unknown) => void,
): Promise<string[]> {
  // Build compact selector input — one row per category
  const categories = Object.entries(cappedEvidence).map(([label, data]) => {
    const recurringCount = data.items.filter((i) => i.is_recurring).length;
    const avgSeverity = data.items.length > 0
      ? Math.round((data.items.reduce((s, i) => s + i.severity, 0) / data.items.length) * 10) / 10
      : 0;
    return {
      id: data.category_id,
      label,
      total: data.total_in_category,
      avg_severity: avgSeverity,
      recurring_count: recurringCount,
      sample_quote: data.items[0]?.evidence ?? "",
    };
  });

  if (categories.length === 0) return [];

  const input = JSON.stringify({ business: businessName, categories });
  const start = Date.now();

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: [{ type: "text", text: SELECTOR_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: input }],
    });
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";

    // Parse JSON
    let parsed: { selected?: string[]; reason?: string } | null = null;
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const cleanText = fence ? fence[1].trim() : raw;
    try {
      parsed = JSON.parse(cleanText);
    } catch {
      const objectMatch = cleanText.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try { parsed = JSON.parse(objectMatch[0]); } catch { /* skip */ }
      }
    }

    const selected = (parsed?.selected ?? []).slice(0, 3);
    emit("log", { message: `🎯 Selector: picked [${selected.join(", ")}] in ${((Date.now() - start) / 1000).toFixed(1)}s — ${parsed?.reason ?? ""}` });
    return selected;
  } catch (err) {
    emit("log", { message: `❌ Selector failed: ${err instanceof Error ? err.message : String(err)}`, level: "error" });
    // Fallback: pick top categories by score (frequency × severity)
    return categories
      .filter((c) => c.total >= 3 || c.avg_severity >= 4.5)
      .sort((a, b) => (b.total * b.avg_severity) - (a.total * a.avg_severity))
      .slice(0, 3)
      .map((c) => c.id);
  }
}

// ── Stage 2: Writers (Sonnet, parallel) ────────────────────────────────

interface FindingWriterOutput {
  title: string;
  category_id: string;
  pattern: string;
  quotes: { text: string; rating: number; date: string; reviewer_name: string }[];
  root_cause: string;
  impact: string;
  how_addressed: string;
  citations_used: string[];
}

async function writeFinding(
  businessName: string,
  categoryLabel: string,
  categoryId: string,
  evidence: { category_id: string; items: EvidenceItem[]; total_in_category: number },
  emit: (event: string, data: unknown) => void,
): Promise<FindingWriterOutput | null> {
  const input = JSON.stringify({
    business: businessName,
    category_label: categoryLabel,
    category_id: categoryId,
    total_in_category: evidence.total_in_category,
    evidence: evidence.items.map((i) => ({
      text: i.evidence,
      rating: i.rating,
      date: i.date,
      reviewer_name: i.reviewer_name,
      severity: i.severity,
      is_recurring: i.is_recurring,
    })),
  });

  const start = Date.now();
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: [{ type: "text", text: FINDING_WRITER_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: input }],
    });
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    emit("log", { message: `📝 Finding writer (${categoryLabel}): ${raw.length} chars in ${((Date.now() - start) / 1000).toFixed(1)}s` });

    const parsed = parseSonnetJSON(raw, emit);
    if (!parsed) return null;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    return {
      title: (parsed.title as string) ?? "",
      category_id: (parsed.category_id as string) ?? categoryId,
      pattern: (parsed.pattern as string) ?? "",
      quotes: ((parsed.quotes as any[]) ?? []).map((q: any) => ({
        text: q.text ?? "",
        rating: q.rating ?? 0,
        date: q.date ?? "",
        reviewer_name: q.reviewer_name ?? "",
      })),
      root_cause: (parsed.root_cause as string) ?? "",
      impact: (parsed.impact as string) ?? "",
      how_addressed: (parsed.how_addressed as string) ?? "",
      citations_used: ((parsed.citations_used as string[]) ?? []),
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
  } catch (err) {
    emit("log", { message: `❌ Finding writer (${categoryLabel}) failed: ${err instanceof Error ? err.message : String(err)}`, level: "error" });
    return null;
  }
}

interface StrengthsWriterOutput {
  strength_titles: string[];
  strength_commentaries: string[];
}

async function writeStrengths(
  businessName: string,
  positiveEvidence: { evidence: string; rating: number; category: string }[],
  categorySummary: ReportAggregates["category_summary"],
  emit: (event: string, data: unknown) => void,
): Promise<StrengthsWriterOutput | null> {
  const input = JSON.stringify({
    business: businessName,
    positive_evidence: positiveEvidence,
    category_summary: categorySummary,
  });

  const start = Date.now();
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [{ type: "text", text: STRENGTHS_WRITER_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: input }],
    });
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    emit("log", { message: `📝 Strengths writer: ${raw.length} chars in ${((Date.now() - start) / 1000).toFixed(1)}s` });

    const parsed = parseSonnetJSON(raw, emit);
    if (!parsed) return null;

    return {
      strength_titles: (parsed.strength_titles as string[]) ?? [],
      strength_commentaries: (parsed.strength_commentaries as string[]) ?? [],
    };
  } catch (err) {
    emit("log", { message: `❌ Strengths writer failed: ${err instanceof Error ? err.message : String(err)}`, level: "error" });
    return null;
  }
}

interface RecommendationOutput {
  priority: number;
  title: string;
  description: string;
  category_ids: string[];
  pillar_ids: string[];
}

async function writeRecommendations(
  businessName: string,
  selectedFindings: { category_label: string; category_id: string }[],
  pillarSummary: ReportAggregates["pillar_summary"],
  emit: (event: string, data: unknown) => void,
): Promise<RecommendationOutput[]> {
  if (selectedFindings.length === 0) return [];

  const input = JSON.stringify({
    business: businessName,
    selected_findings: selectedFindings,
    pillar_summary: pillarSummary,
  });

  const start = Date.now();
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [{ type: "text", text: RECOMMENDATIONS_WRITER_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: input }],
    });
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    emit("log", { message: `📝 Recommendations writer: ${raw.length} chars in ${((Date.now() - start) / 1000).toFixed(1)}s` });

    const parsed = parseSonnetJSON(raw, emit);
    if (!parsed) return [];

    /* eslint-disable @typescript-eslint/no-explicit-any */
    return ((parsed.recommendations as any[]) ?? []).map((r: any) => ({
      priority: r.priority ?? 0,
      title: r.title ?? "",
      description: r.description ?? "",
      category_ids: r.category_ids ?? [],
      pillar_ids: r.pillar_ids ?? [],
    }));
    /* eslint-enable @typescript-eslint/no-explicit-any */
  } catch (err) {
    emit("log", { message: `❌ Recommendations writer failed: ${err instanceof Error ? err.message : String(err)}`, level: "error" });
    return [];
  }
}

interface ExecSummaryOutput {
  executive_summary: string;
  trend_analysis: string;
  methodology: string;
}

async function writeExecSummary(
  businessName: string,
  avgRating: number,
  totalReviews: number,
  reviewsAnalyzed: number,
  selectedFindings: { category_label: string; category_id: string }[],
  aggregates: ReportAggregates,
  emit: (event: string, data: unknown) => void,
): Promise<ExecSummaryOutput | null> {
  const input = JSON.stringify({
    business_name: businessName,
    average_rating: avgRating,
    total_reviews: totalReviews,
    reviews_analyzed: reviewsAnalyzed,
    trend: aggregates.trend,
    owner_response_rate: aggregates.owner_response_rate,
    turnover_signal_count: aggregates.turnover_signal_count,
    selected_finding_themes: selectedFindings.map((f) => f.category_label),
    category_summary: aggregates.category_summary,
  });

  const start = Date.now();
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [{ type: "text", text: EXEC_SUMMARY_WRITER_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: input }],
    });
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    emit("log", { message: `📝 Exec summary writer: ${raw.length} chars in ${((Date.now() - start) / 1000).toFixed(1)}s` });

    const parsed = parseSonnetJSON(raw, emit);
    if (!parsed) return null;

    return {
      executive_summary: (parsed.executive_summary as string) ?? "",
      trend_analysis: (parsed.trend_analysis as string) ?? "",
      methodology: (parsed.methodology as string) ?? "",
    };
  } catch (err) {
    emit("log", { message: `❌ Exec summary writer failed: ${err instanceof Error ? err.message : String(err)}`, level: "error" });
    return null;
  }
}

// ── Orchestrator ───────────────────────────────────────────────────────

async function generateReport(
  businessName: string,
  avgRating: number,
  totalReviews: number,
  categorized: CategorizedReview[],
  aggregates: ReportAggregates,
  emit: (event: string, data: unknown) => void,
): Promise<ReportResult> {
  const negativeEvidence = groupNegativeEvidence(categorized);
  const positiveEvidence = samplePositiveEvidence(categorized);

  const negCount = Object.values(negativeEvidence).reduce((s, arr) => s + arr.length, 0);
  // Cap at 8 evidence items per category, use human labels as keys
  const cappedEvidence: Record<string, { category_id: string; items: EvidenceItem[]; total_in_category: number }> = {};
  for (const [catId, items] of Object.entries(negativeEvidence)) {
    const catDef = CATEGORY_MAP.get(catId as ReportCategoryId);
    const label = catDef?.label ?? catId;
    const sorted = items.sort((a, b) => b.severity - a.severity);
    cappedEvidence[label] = {
      category_id: catId,
      items: sorted.slice(0, 8),
      total_in_category: items.length,
    };
  }
  const cappedCount = Object.values(cappedEvidence).reduce((s, c) => s + c.items.length, 0);

  emit("log", { message: `🔍 Evidence: ${Object.keys(negativeEvidence).length} neg categories (${negCount} total, ${cappedCount} sent), ${positiveEvidence.length} positive samples` });

  // ── Stage 1: Selector ──
  const selectedCategoryIds = await selectFindingCategories(businessName, cappedEvidence, emit);

  // Build selector → label/id mapping for downstream calls
  const labelByCatId = new Map<string, string>();
  for (const [label, data] of Object.entries(cappedEvidence)) {
    labelByCatId.set(data.category_id, label);
  }
  const selectedFindings = selectedCategoryIds
    .filter((id) => labelByCatId.has(id))
    .map((id) => ({ category_id: id, category_label: labelByCatId.get(id) ?? id }));

  // ── Stage 2: Parallel writers ──
  emit("log", { message: `📝 Firing ${selectedFindings.length} finding writers + strengths + recommendations + exec summary in parallel` });

  const findingPromises = selectedFindings.map((sel) => {
    const evidence = cappedEvidence[sel.category_label];
    if (!evidence) return Promise.resolve(null);
    return writeFinding(businessName, sel.category_label, sel.category_id, evidence, emit);
  });

  const [
    findingResults,
    strengthsResult,
    recommendations,
    execSummaryResult,
  ] = await Promise.all([
    Promise.all(findingPromises),
    writeStrengths(businessName, positiveEvidence, aggregates.category_summary, emit),
    writeRecommendations(businessName, selectedFindings, aggregates.pillar_summary, emit),
    writeExecSummary(businessName, avgRating, totalReviews, categorized.length, selectedFindings, aggregates, emit),
  ]);

  // ── Merge results ──

  const findings = findingResults
    .filter((f): f is FindingWriterOutput => f !== null)
    .map((f) => ({
      title: f.title,
      category_id: f.category_id as ReportCategoryId,
      pattern: f.pattern,
      quotes: f.quotes,
      root_cause: f.root_cause,
      impact: f.impact,
      how_addressed: f.how_addressed,
      // Attach pre-computed current→desired templates
      current_vs_desired: CURRENT_DESIRED[f.category_id as ReportCategoryId] ?? [],
    }));

  // Collect citations from all findings, dedupe, assign IDs
  const usedCitationKeys = new Set<string>();
  for (const f of findingResults) {
    if (f) for (const key of f.citations_used) usedCitationKeys.add(key);
  }
  const citations = [...usedCitationKeys]
    .filter((key) => CITATION_DEFINITIONS[key])
    .map((key, i) => ({
      id: i + 1,
      source: CITATION_DEFINITIONS[key].source,
      finding: CITATION_DEFINITIONS[key].finding,
    }));

  // Strengths: merge writer output with positive evidence quote groups
  const strengthTitles = strengthsResult?.strength_titles ?? [];
  const strengthCommentaries = strengthsResult?.strength_commentaries ?? [];

  const posByCat = new Map<string, typeof positiveEvidence>();
  for (const p of positiveEvidence) {
    if (!posByCat.has(p.category)) posByCat.set(p.category, []);
    posByCat.get(p.category)!.push(p);
  }
  const topPosCats = [...posByCat.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3);

  const strengths = topPosCats.map(([catId, items], i) => {
    const catDef = CATEGORY_MAP.get(catId as ReportCategoryId);
    return {
      title: strengthTitles[i] ?? catDef?.label ?? catId,
      commentary: strengthCommentaries[i] ?? "",
      quotes: items.slice(0, 3).map((item) => ({
        text: item.evidence,
        rating: item.rating,
        date: "",
      })),
    };
  });

  return {
    executive_summary: execSummaryResult?.executive_summary ?? "",
    strengths,
    findings,
    trend_analysis: execSummaryResult?.trend_analysis ?? "",
    recommendations: recommendations.map((r) => ({
      ...r,
      category_ids: r.category_ids as ReportCategoryId[],
      pillar_ids: r.pillar_ids as PillarId[],
    })),
    methodology: execSummaryResult?.methodology ?? "",
    citations,
    _debug: {
      selectedCategories: selectedCategoryIds,
      findingCount: findings.length,
      negativeEvidenceCount: negCount,
      positiveEvidenceCount: positiveEvidence.length,
      citationCount: citations.length,
    },
  };
}

// ── Legacy format converter (for backward compat with lite pipeline) ──

function toLegacyFormat(categorized: CategorizedReview[]): {
  insights: ReviewInsight[];
  positiveCount: number;
  negativeCount: number;
  totalReviewsAnalyzed: number;
} {
  const insights: ReviewInsight[] = [];
  let pos = 0, neg = 0;

  for (const r of categorized) {
    for (const cat of r.categories) {
      const catDef = CATEGORY_MAP.get(cat.id);
      insights.push({
        reviewAuthor: r.reviewer_name,
        reviewText: r.text,
        reviewRating: r.rating,
        reviewDate: r.date,
        sentiment: cat.sentiment === "mixed" ? "negative" : cat.sentiment,
        category: "service-attitude", // map to legacy type
        relevantExcerpt: cat.evidence,
        locationName: "",
        allgravyModule: catDef?.module ?? "",
      });
      if (cat.sentiment === "positive") pos++;
      else neg++;
    }
  }

  return { insights, positiveCount: pos, negativeCount: neg, totalReviewsAnalyzed: categorized.length };
}

// ── Review fetch configs ───────────────────────────────────────────────

const REVIEWS_PER_CALL = 50;

// ── Main handler ───────────────────────────────────────────────────────

export async function POST(request: Request) {
  const url = new URL(request.url);
  const lite = url.searchParams.get("lite") === "1";

  const { locations: rawLocations } = (await request.json()) as { locations: PlaceSummary[] };

  if (!rawLocations?.length) {
    return Response.json({ error: "locations required" }, { status: 400 });
  }

  // Lite mode: single location, legacy format, fast
  if (lite) {
    const locations = rawLocations.slice(0, 1);
    return runLitePipeline(locations);
  }

  // Full mode: new v2 pipeline
  const { sampled: locations, total: locationsTotal } = sampleLocations(rawLocations);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sseEvent(event, data)));

      const t0 = Date.now();
      const ts = () => Date.now() - t0;

      try {
        const allReviews: ReviewForAnalysis[] = [];
        const allCategorized: CategorizedReview[] = [];
        const seen = new Set<string>();
        let batchCounter = 0;
        const skipTier2 = locations.length > 5;

        // Two parallel calls per location:
        // 1) newest 200 — natural distribution for quant overview + strengths
        // 2) lowest-rated 100 — dedicated findings material
        const newestPerLoc = Math.max(50, Math.floor(200 / locations.length));
        const lowestPerLoc = Math.max(30, Math.floor(100 / locations.length));

        // Incremental Sonnet merges on 8s interval
        let lastMergedCount = 0;
        const mergeInterval = setInterval(async () => {
          if (allCategorized.length > lastMergedCount && allCategorized.length >= 10) {
            lastMergedCount = allCategorized.length;
            try {
              const interimRating = rawLocations[0]?.rating ?? 0;
              const aggregates = computeAggregates(allCategorized, allReviews, interimRating);
              emit("aggregates", aggregates);

              // Only send analysis_update with legacy shape for progressive rendering
              const legacy = toLegacyFormat(allCategorized);
              emit("analysis_update", {
                ...legacy.insights.length > 0 ? {
                  headline: `Analysing ${allCategorized.length} categorised reviews...`,
                  body: "",
                  insights: legacy.insights,
                  totalReviewsAnalyzed: legacy.totalReviewsAnalyzed,
                  positiveCount: legacy.positiveCount,
                  negativeCount: legacy.negativeCount,
                  categoryBreakdown: [],
                  strengths: [],
                  opportunities: [],
                } : {},
              });
            } catch {
              // retry next interval
            }
          }
        }, 8000);

        // ── Two parallel Apify calls per location ──
        // 1) newest (natural distribution) — for quant overview + strengths
        // 2) lowest-rated — dedicated findings material

        const allPromises: Promise<void>[] = [];

        const processApifyResults = async (
          loc: PlaceSummary,
          reviews: ApifyReview[],
          label: "newest" | "lowest",
          fetchStart: number,
        ) => {
          const newReviews: ReviewForAnalysis[] = [];
          for (const r of reviews) {
            const key = `${r.reviewerId}|${r.publishedAtDate}`;
            if (seen.has(key)) continue;
            seen.add(key);
            newReviews.push({
              review_id: `${loc.placeId}_${r.reviewerId}_${r.publishedAtDate}`,
              author: r.reviewerName,
              rating: r.stars,
              text: r.text,
              date: r.publishedAtDate,
              locationName: loc.displayName,
              responseFromOwner: r.responseFromOwnerText ?? null,
              source: label,
            });
          }

          allReviews.push(...newReviews);

          // Split: reviews with text go to Haiku, rating-only reviews only count for quant
          const reviewsWithText = newReviews.filter((r) => r.text && r.text.trim().length > 0);
          const ratingOnlyCount = newReviews.length - reviewsWithText.length;

          emit("timing", {
            id: `apify_${loc.placeId}_${label}`,
            label: `Apify ${loc.displayName} ${label}`,
            startMs: fetchStart,
            endMs: ts(),
            detail: `${reviews.length} raw → ${newReviews.length} new (${ratingOnlyCount} rating-only)`,
          });

          emit("reviews_progress", {
            placeId: loc.placeId,
            displayName: loc.displayName,
            reviewCount: newReviews.length,
            sort: label,
          });

          if (reviewsWithText.length === 0) return;

          // Haiku classify — only reviews with text, ALL batches in parallel
          // Empirical result from sweep test on 200 reviews:
          // batch=1: 4.8s (149 calls), batch=2: 3.9s (75), batch=3: 4.4s (50),
          // batch=5: 6.7s, batch=10: 11.3s, batch=20: 18.6s, batch=30: 23.9s
          // batch=3 chosen: only 0.5s slower than batch=2, but supports
          // 5 concurrent users vs 3 (33% fewer Haiku calls per run).
          const batchSize = 3;
          const batches = chunkArray(reviewsWithText, batchSize);
          emit("log", { message: `🤖 Haiku: classifying ${newReviews.length} ${label} reviews in ${batches.length} parallel batches` });

          await Promise.all(batches.map(async (batch) => {
            const batchIdx = batchCounter++;
            const batchStart = ts();
            const result = await classifyBatch(batch, skipTier2);

            emit("timing", {
              id: `haiku_batch_${batchIdx}`,
              label: `Haiku classify`,
              startMs: batchStart,
              endMs: ts(),
              detail: `${batch.length} reviews → ${result.length} categorized`,
            });

            emit("log", { message: `✅ Haiku batch ${batchIdx}: ${batch.length} → ${result.length} categorized (${((ts() - batchStart) / 1000).toFixed(1)}s)` });

            if (result.length > 0) {
              allCategorized.push(...result);
              emit("batch_analysis", {
                placeId: loc.placeId,
                displayName: loc.displayName,
                batchIndex: batchIdx,
                categorized: result,
                insights: toLegacyFormat(result).insights,
              });
            }
          }));
        };

        // Track which sorts succeeded so we can detect partial failures
        const sortStatus = new Map<string, { newest: boolean; lowest: boolean }>();
        for (const loc of locations) sortStatus.set(loc.placeId, { newest: false, lowest: false });

        const fetchWithRetry = async (
          loc: PlaceSummary,
          sort: "newest" | "lowestRanking",
          label: "newest" | "lowest",
          limit: number,
        ): Promise<boolean> => {
          let attempt = 0;
          const maxAttempts = 2;
          while (attempt < maxAttempts) {
            attempt++;
            const fetchStart = ts();
            const timeout = attempt === 1 ? 60 : 90;
            emit("log", { message: `⏳ Apify: fetching ${limit} ${label} for ${loc.displayName} (attempt ${attempt}, timeout ${timeout}s)` });
            try {
              const reviews = await fetchApifyReviews([loc.placeId], limit, sort, timeout);
              await processApifyResults(loc, reviews, label, fetchStart);
              return true;
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              emit("log", { message: `❌ Apify ${label} attempt ${attempt} failed: ${errMsg}`, level: "error" });
              if (attempt >= maxAttempts) return false;
              emit("log", { message: `🔄 Retrying ${label} fetch...` });
            }
          }
          return false;
        };

        for (const loc of locations) {
          allPromises.push(
            (async () => {
              const ok = await fetchWithRetry(loc, "newest", "newest", newestPerLoc);
              sortStatus.get(loc.placeId)!.newest = ok;
            })()
          );
          allPromises.push(
            (async () => {
              const ok = await fetchWithRetry(loc, "lowestRanking", "lowest", lowestPerLoc);
              sortStatus.get(loc.placeId)!.lowest = ok;
            })()
          );
        }

        // Wait for all scraping + classification
        await Promise.all(allPromises);
        clearInterval(mergeInterval);

        // ── Validate sample integrity ──
        const newestSucceeded = [...sortStatus.values()].some((s) => s.newest);
        const lowestSucceeded = [...sortStatus.values()].some((s) => s.lowest);

        if (!newestSucceeded && !lowestSucceeded) {
          emit("error", { message: "All Apify calls failed. Cannot generate report." });
          emit("log", { message: `❌ FATAL: Both newest and lowest fetches failed for all locations`, level: "error" });
          controller.close();
          return;
        }

        if (!newestSucceeded) {
          // Only lowest-rated reviews — sample is heavily skewed, cannot produce reliable trend
          emit("error", {
            message: "Newest reviews fetch failed. Sample is biased toward 1-2 star reviews and would produce a misleading report. Please retry.",
          });
          emit("log", { message: `❌ FATAL: Newest fetch failed — sample is skewed (only lowest-rated reviews available). Aborting.`, level: "error" });
          controller.close();
          return;
        }

        if (!lowestSucceeded) {
          emit("log", { message: `⚠️ Lowest-rated fetch failed — findings will rely on negative reviews from the newest sample only`, level: "error" });
        }

        // ── Compute aggregates ──
        // Rating distribution and avg use ONLY newest-sourced reviews (representative sample).
        // Lowest-sourced reviews are findings material, not for rating calculations.
        const newestForStats = allReviews.filter((r) => r.source === "newest");
        const ratingDist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
        for (const r of newestForStats) ratingDist[String(r.rating)] = (ratingDist[String(r.rating)] ?? 0) + 1;
        const avgRating = newestForStats.length > 0
          ? Math.round((newestForStats.reduce((s, r) => s + r.rating, 0) / newestForStats.length) * 10) / 10
          : 0;

        // Get lifetime rating from Google Places if not provided in request
        let lifetimeRating = rawLocations[0]?.rating;
        let lifetimeReviewCount = rawLocations[0]?.userRatingCount;
        if (lifetimeRating === undefined || lifetimeRating === null) {
          try {
            emit("log", { message: `🔎 Fetching lifetime rating from Google Places...` });
            const details = await getPlaceDetails(rawLocations[0].placeId);
            lifetimeRating = details.rating;
            lifetimeReviewCount = details.userRatingCount;
            emit("log", { message: `✅ Google Places: ${lifetimeRating}/5 (${lifetimeReviewCount} lifetime reviews)` });
          } catch (err) {
            emit("log", { message: `⚠️ Could not fetch lifetime rating: ${err instanceof Error ? err.message : String(err)}`, level: "error" });
          }
        } else {
          emit("log", { message: `✅ Lifetime rating from request: ${lifetimeRating}/5 (${lifetimeReviewCount ?? '?'} reviews)` });
        }

        const finalLifetimeRating = lifetimeRating ?? avgRating;
        const aggregates = computeAggregates(allCategorized, allReviews, finalLifetimeRating);
        emit("aggregates", aggregates);

        // ── Sonnet: generate structured report ──
        emit("log", { message: `📊 Aggregated: ${Object.keys(aggregates.category_summary).length} categories, ${aggregates.turnover_signal_count} turnover signals, trend: ${aggregates.trend.direction}` });

        if (allCategorized.length > 0) {
          const sonnetStart = ts();
          emit("log", { message: `📝 Sonnet: generating report from ${allCategorized.length} categorized reviews (~${Math.round(JSON.stringify(allCategorized).length / 4)} est. input tokens)` });

          const reportContent = await generateReport(
            rawLocations[0].displayName,
            avgRating,
            allReviews.length,
            allCategorized,
            aggregates,
            emit,
          );

          const debug = (reportContent as Record<string, unknown>)._debug as Record<string, unknown> | undefined;
          emit("log", {
            message: `${reportContent.findings.length > 0 ? '✅' : '⚠️'} Sonnet done: ${reportContent.findings.length} findings, ${reportContent.strengths.length} strengths, ${reportContent.executive_summary.length} chars exec summary` +
              (debug ? ` | model: ${debug.model}, ~${debug.inputTokens} input tokens, ${debug.outputLength} output chars` : '') +
              (debug?.failed ? ` | FAILED — preview: ${String(debug.rawPreview).slice(0, 200)}` : ''),
            level: debug?.failed ? 'error' : undefined,
          });

          emit("timing", {
            id: "sonnet_report",
            label: "Sonnet Report",
            startMs: sonnetStart,
            endMs: ts(),
            detail: `${allCategorized.length} categorized → ${reportContent.findings.length} findings`,
          });

          const fullReport: GuestFeedbackReport = {
            ...reportContent,
            quantitative_overview: {
              rating_distribution: ratingDist,
              trend: aggregates.trend,
              category_heatmap: Object.entries(aggregates.category_summary).map(([id, data]) => ({
                id: id as ReportCategoryId,
                label: CATEGORY_MAP.get(id as ReportCategoryId)?.label ?? id,
                total: data.total,
                negative: data.negative,
                avg_severity: data.avg_severity,
              })),
              pillar_summary: (["P1", "P2", "P3", "P4"] as PillarId[]).map((pid) => ({
                id: pid,
                label: PILLAR_LABELS[pid],
                ...(aggregates.pillar_summary[pid] ?? { reviews_impacted: 0, pct_of_negative: 0, top_categories: [] }),
              })),
              owner_response_rate: aggregates.owner_response_rate,
            },
            metadata: {
              business_name: rawLocations[0].displayName,
              total_reviews: lifetimeReviewCount ?? allReviews.length,
              average_rating: finalLifetimeRating,
              rating_distribution: ratingDist,
              reviews_analyzed: allCategorized.length,
              locations_sampled: locations.length,
              locations_total: locationsTotal,
              analysis_date: new Date().toISOString().split("T")[0],
              report_type: allCategorized.length < 20 ? "preliminary" : "full",
              pipeline_duration_seconds: Math.round(ts() / 100) / 10,
            },
            categorized_reviews: allCategorized,
            aggregates,
          };

          emit("analysis", fullReport);

          // Save report to disk for comparison across iterations
          try {
            const fs = await import("fs/promises");
            const path = await import("path");
            const reportsDir = path.join(process.cwd(), "reports");
            await fs.mkdir(reportsDir, { recursive: true });
            const slug = rawLocations[0].displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            const filename = `${slug}_${timestamp}.json`;
            await fs.writeFile(path.join(reportsDir, filename), JSON.stringify(fullReport, null, 2));
            emit("log", { message: `💾 Report saved: reports/${filename}` });
          } catch (saveErr) {
            emit("log", { message: `⚠️ Failed to save report: ${saveErr instanceof Error ? saveErr.message : String(saveErr)}`, level: "error" });
          }

          // Also emit legacy format for backward compat with existing gathering UI
          const legacy = toLegacyFormat(allCategorized);
          const legacyAnalysis: ReviewAnalysis = {
            headline: reportContent.executive_summary.split(".")[0] + ".",
            body: reportContent.executive_summary,
            insights: legacy.insights,
            totalReviewsAnalyzed: legacy.totalReviewsAnalyzed,
            positiveCount: legacy.positiveCount,
            negativeCount: legacy.negativeCount,
            categoryBreakdown: Object.entries(aggregates.category_summary).map(([cat, data]) => ({
              category: CATEGORY_MAP.get(cat as ReportCategoryId)?.label ?? cat,
              allgravyModule: CATEGORY_MAP.get(cat as ReportCategoryId)?.module ?? "",
              percentage: Math.round((data.total / Math.max(allCategorized.length, 1)) * 100),
              count: data.total,
              sentiment: data.negative > data.positive ? "mostly-negative" as const : data.positive > data.negative ? "mostly-positive" as const : "mixed" as const,
            })),
            strengths: reportContent.strengths.map((s) => s.title),
            opportunities: reportContent.recommendations.map((r) => r.title),
          };
          emit("analysis", legacyAnalysis);
        }

        emit("timing", {
          id: "total",
          label: "Total pipeline",
          startMs: 0,
          endMs: ts(),
          detail: `${locations.length} locations, ${seen.size} reviews, ${allCategorized.length} categorized`,
        });

        emit("done", { locations_sampled: locations.length, locations_total: locationsTotal });
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

// ── Lite pipeline (unchanged legacy format for single-location quick scan) ──

function runLitePipeline(locations: PlaceSummary[]) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sseEvent(event, data)));

      const t0 = Date.now();
      const ts = () => Date.now() - t0;

      try {
        const allReviews: ReviewForAnalysis[] = [];
        const allCategorized: CategorizedReview[] = [];
        const seen = new Set<string>();

        const loc = locations[0];
        const reviews = await fetchApifyReviews([loc.placeId], 50, "newest", 25);

        for (const r of reviews) {
          const key = `${r.reviewerId}|${r.publishedAtDate}`;
          if (seen.has(key)) continue;
          seen.add(key);
          allReviews.push({
            review_id: `${loc.placeId}_${r.reviewerId}`,
            author: r.reviewerName,
            rating: r.stars,
            text: r.text,
            date: r.publishedAtDate,
            locationName: loc.displayName,
            responseFromOwner: r.responseFromOwnerText ?? null,
            source: "newest",
          });
        }

        emit("reviews_progress", { placeId: loc.placeId, displayName: loc.displayName, reviewCount: allReviews.length, sort: "newest" });

        if (allReviews.length > 0) {
          const batches = chunkArray(allReviews, 10);
          for (const batch of batches) {
            const result = await classifyBatch(batch, false);
            allCategorized.push(...result);
            const legacy = toLegacyFormat(result);
            emit("batch_analysis", { placeId: loc.placeId, displayName: loc.displayName, insights: legacy.insights });
          }
        }

        // Quick merge for lite — just legacy format
        if (allCategorized.length > 0) {
          const legacy = toLegacyFormat(allCategorized);
          const aggregates = computeAggregates(allCategorized, allReviews, locations[0]?.rating ?? 0);

          const legacyAnalysis: ReviewAnalysis = {
            headline: "",
            body: "",
            insights: legacy.insights,
            totalReviewsAnalyzed: legacy.totalReviewsAnalyzed,
            positiveCount: legacy.positiveCount,
            negativeCount: legacy.negativeCount,
            categoryBreakdown: Object.entries(aggregates.category_summary).map(([cat, data]) => ({
              category: CATEGORY_MAP.get(cat as ReportCategoryId)?.label ?? cat,
              allgravyModule: CATEGORY_MAP.get(cat as ReportCategoryId)?.module ?? "",
              percentage: Math.round((data.total / Math.max(allCategorized.length, 1)) * 100),
              count: data.total,
              sentiment: data.negative > data.positive ? "mostly-negative" as const : data.positive > data.negative ? "mostly-positive" as const : "mixed" as const,
            })),
            strengths: [],
            opportunities: [],
          };
          emit("analysis", legacyAnalysis);
        }

        emit("done", {});
      } catch (err) {
        emit("error", { message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
