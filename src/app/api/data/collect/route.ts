import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchSignals, DATA_TEST_SIGNALS } from "@/lib/saber";
import { searchPlaces, getPlaceDetails } from "@/lib/google-places";
import { fetchOutscraperReviews } from "@/lib/outscraper";
import { describeBrand } from "@/lib/logodev";
import { enrichCompany, findEmployees } from "@/lib/waterfall";
import type { CompanyInsight } from "@/lib/saber";
import type { PlaceSummary, PlaceDetails } from "@/lib/types";
import type { OutscraperPlace } from "@/lib/outscraper";
import type { BrandData } from "@/lib/logodev";
import type { WaterfallSearchResult } from "@/lib/waterfall";

export const maxDuration = 300;

// --- Timing helper ---

interface TimedResult<T> {
  durationMs: number;
  status: "ok" | "error";
  data?: T;
  error?: string;
}

async function timed<T>(fn: () => Promise<T>): Promise<TimedResult<T>> {
  const start = Date.now();
  try {
    const data = await fn();
    return { durationMs: Date.now() - start, status: "ok", data };
  } catch (err) {
    return {
      durationMs: Date.now() - start,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// --- Response type ---

export interface CollectResponse {
  domain: string;
  totalDurationMs: number;
  pipelines: {
    saber: TimedResult<CompanyInsight[]> & { signalCount?: number; completedCount?: number };
    googlePlaces: TimedResult<{
      locations: PlaceSummary[];
      details: (TimedResult<PlaceDetails> & { placeId: string; displayName: string })[];
    }>;
    outscraper: TimedResult<{
      reviews: (TimedResult<OutscraperPlace | null> & { placeId: string; displayName: string })[];
    }>;
    logoDev: TimedResult<BrandData>;
    waterfall: TimedResult<WaterfallSearchResult>;
  };
}

export async function POST(request: Request) {
  const totalStart = Date.now();

  try {
    const { domain } = await request.json();

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "domain is required" },
        { status: 400 }
      );
    }

    const brandName = domain.split(".")[0];

    // Phase 1: Fire all independent pipelines in parallel
    const [saberResult, placesResult, logoResult, waterfallResult] =
      await Promise.all([
        timed(() => fetchSignals(domain, DATA_TEST_SIGNALS)),
        timed(() => searchPlaces(brandName, domain)),
        timed(() => describeBrand(domain)),
        timed(() => findEmployees(domain)),
      ]);

    // Phase 2: With places found, fetch details + Outscraper reviews in parallel
    const locations = placesResult.data ?? [];
    const topLocations = locations.slice(0, 5);

    const [detailResults, outscraperResults] = await Promise.all([
      // Google Place Details
      Promise.all(
        topLocations.map(async (place) => {
          const result = await timed(() => getPlaceDetails(place.placeId));
          return { ...result, placeId: place.placeId, displayName: place.displayName };
        })
      ),
      // Outscraper reviews (more than 5 per location)
      Promise.all(
        topLocations.map(async (place) => {
          const result = await timed(() =>
            fetchOutscraperReviews(place.placeId, 30, "newest")
          );
          return { ...result, placeId: place.placeId, displayName: place.displayName };
        })
      ),
    ]);

    // Build response
    const saberInsights = saberResult.data ?? [];
    const response: CollectResponse = {
      domain,
      totalDurationMs: Date.now() - totalStart,
      pipelines: {
        saber: {
          ...saberResult,
          signalCount: saberInsights.length,
          completedCount: saberInsights.filter((s) => s.answer !== null).length,
        },
        googlePlaces: {
          durationMs: placesResult.durationMs + detailResults.reduce((a, d) => a + d.durationMs, 0),
          status: placesResult.status,
          error: placesResult.error,
          data: {
            locations,
            details: detailResults,
          },
        },
        outscraper: {
          durationMs: outscraperResults.reduce((a, d) => a + d.durationMs, 0),
          status: outscraperResults.some((r) => r.status === "ok") ? "ok" : "error",
          data: {
            reviews: outscraperResults,
          },
        },
        logoDev: logoResult,
        waterfall: waterfallResult,
      },
    };

    // Persist to Supabase (fire-and-forget, don't block response)
    persistRun(domain, response).catch((err) =>
      console.error("Failed to persist run:", err)
    );

    return NextResponse.json(response);
  } catch (err) {
    console.error("data/collect error:", err);
    return NextResponse.json(
      {
        error: "Collection failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

// --- Persistence ---

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function persistRun(domain: string, result: CollectResponse) {
  // Check for existing row for this domain — update it instead of inserting
  const { data: existing } = await supabase
    .from("data_collection_runs")
    .select("id")
    .eq("domain", domain)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("data_collection_runs")
      .update({
        total_duration_ms: result.totalDurationMs,
        result,
        created_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("data_collection_runs").insert({
      domain,
      total_duration_ms: result.totalDurationMs,
      result,
    });
    if (error) throw error;
  }
}
