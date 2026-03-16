import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ChainRunSummary {
  id: string;
  place_id: string;
  display_name: string;
  website_domain: string | null;
  total_duration_ms: number;
  strategy_count: number;
  best_strategy: string | null;
  best_filtered_count: number;
  union_count: number;
  created_at: string;
}

export interface ChainRunDetail extends ChainRunSummary {
  result: unknown;
}

// GET /api/data/chain-discovery-runs — list summaries or fetch one by ?id=
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabase
      .from("chain_discovery_runs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data as ChainRunDetail);
  }

  const { data, error } = await supabase
    .from("chain_discovery_runs")
    .select(
      "id, place_id, display_name, website_domain, total_duration_ms, strategy_count, best_strategy, best_filtered_count, union_count, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as ChainRunSummary[]);
}

// POST /api/data/chain-discovery-runs — persist a run
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { error } = await supabase.from("chain_discovery_runs").insert({
      place_id: body.place_id,
      display_name: body.display_name,
      website_domain: body.website_domain ?? null,
      total_duration_ms: body.total_duration_ms,
      strategy_count: body.strategy_count ?? 0,
      best_strategy: body.best_strategy ?? null,
      best_filtered_count: body.best_filtered_count ?? 0,
      union_count: body.union_count ?? 0,
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
