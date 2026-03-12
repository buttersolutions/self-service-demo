import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { CollectResponse } from "@/app/api/data/collect/route";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface RunSummary {
  id: string;
  domain: string;
  total_duration_ms: number;
  created_at: string;
  pipelines_ok: number;
  pipelines_total: number;
  locations_count: number;
  persons_count: number;
  signals_count: number;
}

export interface RunDetail {
  id: string;
  domain: string;
  total_duration_ms: number;
  created_at: string;
  result: CollectResponse;
}

function summarizeRun(row: RunDetail): RunSummary {
  const r = row.result;
  const pipelines = r.pipelines;
  const statuses = [
    pipelines.saber.status,
    pipelines.googlePlaces.status,
    pipelines.outscraper.status,
    pipelines.logoDev.status,
    pipelines.waterfall.status,
  ];

  return {
    id: row.id,
    domain: row.domain,
    total_duration_ms: row.total_duration_ms,
    created_at: row.created_at,
    pipelines_ok: statuses.filter((s) => s === "ok").length,
    pipelines_total: statuses.length,
    locations_count: pipelines.googlePlaces.data?.locations.length ?? 0,
    persons_count: pipelines.waterfall.data?.persons.length ?? 0,
    signals_count: pipelines.saber.completedCount ?? 0,
  };
}

// GET /api/data/runs — list all runs (summaries) or fetch a single run by ?id=
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabase
      .from("data_collection_runs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data as RunDetail);
  }

  // List all — fetch full result to compute summaries server-side
  const { data, error } = await supabase
    .from("data_collection_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summaries = (data as RunDetail[]).map(summarizeRun);
  return NextResponse.json(summaries);
}
