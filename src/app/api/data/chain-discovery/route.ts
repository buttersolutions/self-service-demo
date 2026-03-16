import { NextResponse } from "next/server";
import { textSearch, brandFilter } from "@/lib/google-places";
import type { PlaceSummary } from "@/lib/types";

export const maxDuration = 60;

// --- Configurable strategy ---

export type FilterMode = "domain+name" | "domain_only" | "name_only" | "none";

export interface StrategyConfig {
  label: string;
  /** Text queries to send to Google (each run in parallel) */
  queries: string[];
  /** Region configs — each is a Google locationRestriction or empty for global */
  regions: ("global" | "europe")[];
  /** How to post-filter results */
  filterMode: FilterMode;
  /** Require min review count */
  minReviews: number;
}

export interface StrategyResult {
  label: string;
  config: StrategyConfig;
  durationMs: number;
  rawCount: number;
  filteredCount: number;
  results: PlaceSummary[];
  /** Per-search breakdown for debugging */
  searches: {
    query: string;
    region: string;
    count: number;
    durationMs: number;
  }[];
}

const REGION_MAP: Record<string, Record<string, unknown>> = {
  global: {},
  europe: {
    locationRestriction: {
      rectangle: {
        low: { latitude: 35, longitude: -11 },
        high: { latitude: 71, longitude: 40 },
      },
    },
  },
};

function makeFilter(
  mode: FilterMode,
  websiteDomain: string | undefined,
  displayName: string
): (p: PlaceSummary) => boolean {
  if (mode === "none") return () => true;

  if (!websiteDomain) {
    // Without a domain, fall back to name matching
    const queryWords = displayName
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    return (p) => {
      const nameWords = p.displayName
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);
      return queryWords.some((w) => nameWords.includes(w));
    };
  }

  if (mode === "domain+name") return brandFilter(websiteDomain, displayName);

  if (mode === "domain_only") {
    const brandName = websiteDomain.split(".")[0];
    const brandWords = brandName
      .split(/[-_]/)
      .filter((w) => w.length > 2)
      .map((w) => w.toLowerCase());

    return (p) => {
      if (!p.websiteUri) return false;
      try {
        const hostname = new URL(p.websiteUri).hostname.replace("www.", "");
        if (hostname.includes(brandName)) return true;
        const hostParts = hostname
          .split(".")[0]
          .split(/[-_]/)
          .filter((w) => w.length > 2);
        return hostParts.some((w) => brandWords.includes(w));
      } catch {
        return false;
      }
    };
  }

  // name_only
  const queryWords = displayName
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return (p) => {
    const nameWords = p.displayName
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    return queryWords.some((w) => nameWords.includes(w));
  };
}

async function runStrategy(
  strategy: StrategyConfig,
  websiteDomain: string | undefined,
  displayName: string,
  primaryPlaceId: string | undefined
): Promise<StrategyResult> {
  const t0 = Date.now();
  const filter = makeFilter(strategy.filterMode, websiteDomain, displayName);
  const searchResults: StrategyResult["searches"] = [];

  // Run all query×region combos in parallel
  const searches = strategy.queries.flatMap((q) =>
    strategy.regions.map(async (region) => {
      const regionBody = REGION_MAP[region] ?? {};
      const st = Date.now();
      const results = await textSearch({
        textQuery: q,
        maxResultCount: 20,
        ...regionBody,
      }).catch(() => [] as PlaceSummary[]);
      searchResults.push({
        query: q,
        region,
        count: results.length,
        durationMs: Date.now() - st,
      });
      return results;
    })
  );

  const allResults = await Promise.all(searches);

  // Dedupe
  const seen = new Set<string>();
  const deduped: PlaceSummary[] = [];
  for (const batch of allResults) {
    for (const place of batch) {
      if (!seen.has(place.placeId)) {
        seen.add(place.placeId);
        deduped.push(place);
      }
    }
  }

  const rawCount = deduped.length;

  // Apply filter + min reviews + exclude primary
  const filtered = deduped
    .filter(filter)
    .filter((p) => (p.userRatingCount ?? 0) >= strategy.minReviews)
    .filter((p) => p.placeId !== primaryPlaceId);

  return {
    label: strategy.label,
    config: strategy,
    durationMs: Date.now() - t0,
    rawCount,
    filteredCount: filtered.length,
    results: filtered,
    searches: searchResults,
  };
}

// --- Preset strategies ---

function buildPresets(
  displayName: string,
  websiteDomain: string | undefined
): StrategyConfig[] {
  const brandName = websiteDomain?.split(".")[0];
  const queries = [displayName];
  if (brandName && brandName.toLowerCase() !== displayName.toLowerCase()) {
    queries.push(brandName);
  }

  return [
    {
      label: "Current (multi-region + domain+name)",
      queries,
      regions: ["global", "europe"],
      filterMode: "domain+name",
      minReviews: 1,
    },
    {
      label: "Domain filter only",
      queries,
      regions: ["global", "europe"],
      filterMode: "domain_only",
      minReviews: 1,
    },
    {
      label: "Name filter only",
      queries,
      regions: ["global", "europe"],
      filterMode: "name_only",
      minReviews: 1,
    },
    {
      label: "Global only (no Europe)",
      queries,
      regions: ["global"],
      filterMode: "domain+name",
      minReviews: 1,
    },
    {
      label: "No filter (raw Google results)",
      queries: [displayName],
      regions: ["global"],
      filterMode: "none",
      minReviews: 0,
    },
  ];
}

// --- POST handler ---

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      displayName,
      websiteUri,
      placeId,
      strategies: customStrategies,
    } = body as {
      displayName: string;
      websiteUri?: string;
      placeId?: string;
      strategies?: StrategyConfig[];
    };

    if (!displayName) {
      return NextResponse.json(
        { error: "displayName required" },
        { status: 400 }
      );
    }

    let websiteDomain: string | undefined;
    if (websiteUri) {
      try {
        websiteDomain = new URL(websiteUri).hostname.replace("www.", "");
      } catch {
        /* ignore */
      }
    }

    const strategies =
      customStrategies ?? buildPresets(displayName, websiteDomain);

    const t0 = Date.now();
    const results = await Promise.all(
      strategies.map((s) =>
        runStrategy(s, websiteDomain, displayName, placeId)
      )
    );

    return NextResponse.json({
      displayName,
      websiteDomain: websiteDomain ?? null,
      placeId: placeId ?? null,
      totalDurationMs: Date.now() - t0,
      strategies: results,
    });
  } catch (err) {
    console.error("chain-discovery error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Chain discovery failed",
      },
      { status: 500 }
    );
  }
}
