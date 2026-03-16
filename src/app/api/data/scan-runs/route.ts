import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ScanRunSummary {
  id: string;
  place_id: string;
  display_name: string;
  total_duration_ms: number;
  chain_locations_count: number;
  reviews_collected: number;
  mentions_count: number;
  positive_count: number;
  negative_count: number;
  named_employees_count: number;
  locations_scanned: number;
  created_at: string;
}

export interface ScanRunDetail extends ScanRunSummary {
  result: unknown;
}

// GET /api/data/scan-runs — list all (summaries) or fetch one by ?id=
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabase
      .from("scan_runs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data as ScanRunDetail);
  }

  // List — return without the large result blob
  const { data, error } = await supabase
    .from("scan_runs")
    .select(
      "id, place_id, display_name, total_duration_ms, chain_locations_count, reviews_collected, mentions_count, positive_count, negative_count, named_employees_count, locations_scanned, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as ScanRunSummary[]);
}

// POST /api/data/scan-runs — persist a new run
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { error } = await supabase.from("scan_runs").insert({
      place_id: body.place_id,
      display_name: body.display_name,
      total_duration_ms: body.total_duration_ms,
      chain_locations_count: body.chain_locations_count ?? 0,
      reviews_collected: body.reviews_collected ?? 0,
      mentions_count: body.mentions_count ?? 0,
      positive_count: body.positive_count ?? 0,
      negative_count: body.negative_count ?? 0,
      named_employees_count: body.named_employees_count ?? 0,
      locations_scanned: body.locations_scanned ?? 1,
      result: body.result,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save" },
      { status: 500 }
    );
  }
}
