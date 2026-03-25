"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CollectResponse } from "@/app/api/data/collect/route";
import type { RunSummary } from "@/app/api/data/runs/route";
import { LocationAutocomplete } from "@/components/demo/location-autocomplete";
import type { PlaceSummary, PlaceDetails, ReviewInsight, ReviewAnalysis, ScanResult } from "@/lib/types";

// Legacy aliases — this test harness still uses the old naming
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StaffMention = ReviewInsight & { staffNames?: string[]; namedEmployees?: string[] };
type StaffAnalysis = ReviewAnalysis & { standoutEmployee?: string | null; namedEmployees?: string[]; mentions?: StaffMention[] };
import type { ScanRunSummary, ScanRunDetail } from "@/app/api/data/scan-runs/route";
import type { StrategyResult } from "@/app/api/data/chain-discovery/route";
import type { ChainRunSummary, ChainRunDetail } from "@/app/api/data/chain-discovery-runs/route";

// --- Aggregate helpers ---

interface AggregateStats {
  totalRuns: number;
  uniqueDomains: number;
  avgDurationSec: number;
  pipelineSuccessRates: Record<string, number>;
  avgLocations: number;
  avgPersons: number;
  avgSignals: number;
  domainBreakdown: { domain: string; count: number; lastRun: string }[];
}

function computeAggregate(runs: RunSummary[]): AggregateStats {
  if (runs.length === 0) {
    return {
      totalRuns: 0,
      uniqueDomains: 0,
      avgDurationSec: 0,
      pipelineSuccessRates: {},
      avgLocations: 0,
      avgPersons: 0,
      avgSignals: 0,
      domainBreakdown: [],
    };
  }

  const domainMap = new Map<string, { count: number; lastRun: string }>();
  let totalDuration = 0;
  let totalLocations = 0;
  let totalPersons = 0;
  let totalSignals = 0;
  let totalPipelinesOk = 0;
  let totalPipelinesTotal = 0;

  for (const run of runs) {
    totalDuration += run.total_duration_ms;
    totalLocations += run.locations_count;
    totalPersons += run.persons_count;
    totalSignals += run.signals_count;
    totalPipelinesOk += run.pipelines_ok;
    totalPipelinesTotal += run.pipelines_total;

    const existing = domainMap.get(run.domain);
    if (!existing || run.created_at > existing.lastRun) {
      domainMap.set(run.domain, {
        count: (existing?.count ?? 0) + 1,
        lastRun: run.created_at,
      });
    } else {
      existing.count++;
    }
  }

  const domainBreakdown = Array.from(domainMap.entries())
    .map(([domain, { count, lastRun }]) => ({ domain, count, lastRun }))
    .sort((a, b) => b.count - a.count);

  return {
    totalRuns: runs.length,
    uniqueDomains: domainMap.size,
    avgDurationSec: totalDuration / runs.length / 1000,
    pipelineSuccessRates: {
      overall:
        totalPipelinesTotal > 0
          ? totalPipelinesOk / totalPipelinesTotal
          : 0,
    },
    avgLocations: totalLocations / runs.length,
    avgPersons: totalPersons / runs.length,
    avgSignals: totalSignals / runs.length,
    domainBreakdown,
  };
}

export default function DataPage() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<CollectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Existing runs
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loadingRun, setLoadingRun] = useState(false);
  const [view, setView] = useState<"new" | "history" | "gmaps">("new");

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // Load existing runs on mount
  useEffect(() => {
    fetchRuns();
  }, []);

  async function fetchRuns() {
    setRunsLoading(true);
    try {
      const res = await fetch("/api/data/runs");
      if (res.ok) {
        const data: RunSummary[] = await res.json();
        setRuns(data);
      }
    } catch {
      // silently fail
    } finally {
      setRunsLoading(false);
    }
  }

  async function loadRun(id: string) {
    setLoadingRun(true);
    setSelectedRunId(id);
    setError(null);
    try {
      const res = await fetch(`/api/data/runs?id=${id}`);
      if (!res.ok) throw new Error("Failed to load run");
      const data = await res.json();
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load run");
    } finally {
      setLoadingRun(false);
    }
  }

  async function handleCollect(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setElapsed(0);
    setSelectedRunId(null);

    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 100);

    try {
      const res = await fetch("/api/data/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data: CollectResponse = await res.json();
      setResult(data);
      // Refresh runs list after new collection
      fetchRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Collection failed");
    } finally {
      stopTimer();
      setLoading(false);
    }
  }

  const aggregate = computeAggregate(runs);

  return (
    <div className="mx-auto max-w-5xl p-6 font-mono text-sm">
      <h1 className="text-xl font-bold mb-1">Data Collection Test Harness</h1>
      <p className="text-muted-foreground mb-4">
        Fires Saber + Google Places + Outscraper + Logo.dev + Waterfall in
        parallel.
      </p>

      {/* --- Tab toggle --- */}
      <div className="flex gap-1 mb-6 border-b">
        <button
          onClick={() => setView("new")}
          className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
            view === "new"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          New Collection
        </button>
        <button
          onClick={() => setView("history")}
          className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
            view === "history"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          History ({runs.length})
        </button>
        <button
          onClick={() => setView("gmaps")}
          className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
            view === "gmaps"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Google Maps
        </button>
      </div>

      {view === "history" && (
        <div className="space-y-4 mb-6">
          {/* --- Aggregate overview --- */}
          <Section title="Aggregate Overview" defaultOpen>
            {runsLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No runs yet</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-4">
                  <StatCard label="Total Runs" value={aggregate.totalRuns} />
                  <StatCard
                    label="Unique Domains"
                    value={aggregate.uniqueDomains}
                  />
                  <StatCard
                    label="Avg Duration"
                    value={`${aggregate.avgDurationSec.toFixed(1)}s`}
                  />
                  <StatCard
                    label="Pipeline Success"
                    value={`${Math.round((aggregate.pipelineSuccessRates.overall ?? 0) * 100)}%`}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <StatCard
                    label="Avg Locations"
                    value={aggregate.avgLocations.toFixed(1)}
                  />
                  <StatCard
                    label="Avg People"
                    value={aggregate.avgPersons.toFixed(1)}
                  />
                  <StatCard
                    label="Avg Signals"
                    value={aggregate.avgSignals.toFixed(1)}
                  />
                </div>
                {aggregate.domainBreakdown.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold mb-1">
                      Domains Tested
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {aggregate.domainBreakdown.map((d) => (
                        <Badge
                          key={d.domain}
                          variant="secondary"
                          className="text-xs cursor-pointer"
                          onClick={() => {
                            setDomain(d.domain);
                            setView("new");
                          }}
                        >
                          {d.domain}{" "}
                          {d.count > 1 && (
                            <span className="text-muted-foreground ml-1">
                              x{d.count}
                            </span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* --- Run selector --- */}
          <Section title="Previous Runs" defaultOpen>
            {runsLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No runs found. Start a new collection above.
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-1">Domain</th>
                    <th className="pb-1">Pipelines</th>
                    <th className="pb-1">Locations</th>
                    <th className="pb-1">People</th>
                    <th className="pb-1">Signals</th>
                    <th className="pb-1 text-right">Duration</th>
                    <th className="pb-1 text-right">When</th>
                    <th className="pb-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr
                      key={run.id}
                      className={`border-b border-dashed cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedRunId === run.id ? "bg-muted/50" : ""
                      }`}
                      onClick={() => loadRun(run.id)}
                    >
                      <td className="py-1.5 font-semibold">{run.domain}</td>
                      <td className="py-1.5">
                        <Badge
                          variant={
                            run.pipelines_ok === run.pipelines_total
                              ? "default"
                              : run.pipelines_ok > 0
                                ? "secondary"
                                : "destructive"
                          }
                          className="text-[10px]"
                        >
                          {run.pipelines_ok}/{run.pipelines_total}
                        </Badge>
                      </td>
                      <td className="py-1.5">{run.locations_count}</td>
                      <td className="py-1.5">{run.persons_count}</td>
                      <td className="py-1.5">{run.signals_count}</td>
                      <td className="py-1.5 text-right">
                        {(run.total_duration_ms / 1000).toFixed(1)}s
                      </td>
                      <td className="py-1.5 text-right text-muted-foreground">
                        {formatRelativeTime(run.created_at)}
                      </td>
                      <td className="py-1.5 text-right">
                        {loadingRun && selectedRunId === run.id && (
                          <span className="text-muted-foreground">
                            loading…
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </div>
      )}

      {view === "gmaps" && <GoogleMapsTab />}

      {view === "new" && (
        <form onSubmit={handleCollect} className="flex gap-2 mb-6">
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. kappabar.se"
            className="max-w-xs font-mono"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !domain.trim()}>
            {loading ? `Collecting… ${(elapsed / 1000).toFixed(1)}s` : "Collect"}
          </Button>
        </form>
      )}

      {error && (
        <div className="p-3 rounded bg-destructive/10 text-destructive mb-6">
          {error}
        </div>
      )}

      {result && <ResultView result={result} showRaw={showRaw} setShowRaw={setShowRaw} />}
    </div>
  );
}

// --- Result view (extracted for reuse between new + historical) ---

function ResultView({
  result,
  showRaw,
  setShowRaw,
}: {
  result: CollectResponse;
  showRaw: boolean;
  setShowRaw: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      {/* --- Timing summary --- */}
      <Section title="Timing" defaultOpen>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="pb-1">Pipeline</th>
              <th className="pb-1">Status</th>
              <th className="pb-1 text-right">Duration</th>
            </tr>
          </thead>
          <tbody>
            <Row label="Total" duration={result.totalDurationMs} />
            {/* Saber removed */}
            <Row
              label={`Google Places (${result.pipelines.googlePlaces.data?.locations.length ?? 0} locations)`}
              status={result.pipelines.googlePlaces.status}
              duration={result.pipelines.googlePlaces.durationMs}
            />
            {result.pipelines.googlePlaces.data?.details.map((d) => (
              <Row
                key={d.placeId}
                label={`  ↳ ${d.displayName}`}
                status={d.status}
                duration={d.durationMs}
                indent
              />
            ))}
            <Row
              label={`Outscraper Reviews (${result.pipelines.outscraper.data?.reviews.filter((r) => r.status === "ok").length ?? 0}/${result.pipelines.outscraper.data?.reviews.length ?? 0})`}
              status={result.pipelines.outscraper.status}
              duration={result.pipelines.outscraper.durationMs}
            />
            <Row
              label="Logo.dev (Brand)"
              status={result.pipelines.logoDev.status}
              duration={result.pipelines.logoDev.durationMs}
            />
            <Row
              label={`Waterfall (${result.pipelines.waterfall.data?.persons.length ?? 0} people)`}
              status={result.pipelines.waterfall.status}
              duration={result.pipelines.waterfall.durationMs}
            />
          </tbody>
        </table>
      </Section>

      {/* --- Logo.dev Brand --- */}
      <Section title="Logo.dev: Brand Data" defaultOpen>
        {result.pipelines.logoDev.status === "error" ? (
          <Err msg={result.pipelines.logoDev.error} />
        ) : result.pipelines.logoDev.data ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              {result.pipelines.logoDev.data.logo && (
                <img
                  src={result.pipelines.logoDev.data.logo}
                  alt="Logo"
                  className="h-16 w-16 rounded border object-contain"
                />
              )}
              <div>
                <p className="font-semibold">
                  {result.pipelines.logoDev.data.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.pipelines.logoDev.data.description}
                </p>
              </div>
            </div>
            {result.pipelines.logoDev.data.colors?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-1">Brand Colors</h4>
                <div className="flex gap-2">
                  {result.pipelines.logoDev.data.colors.map((c, i) => (
                    <div key={i} className="text-center">
                      <div
                        className="h-8 w-8 rounded border"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {c.hex}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(result.pipelines.logoDev.data.socials).length >
              0 && (
              <div>
                <h4 className="text-xs font-semibold mb-1">Socials</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(
                    result.pipelines.logoDev.data.socials
                  ).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline"
                    >
                      {platform}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No data</p>
        )}
      </Section>

      {/* --- Waterfall: Company + People --- */}
      <Section
        title={`Waterfall: Company + ${result.pipelines.waterfall.data?.persons.length ?? 0} People`}
        defaultOpen
      >
        {result.pipelines.waterfall.status === "error" ? (
          <Err msg={result.pipelines.waterfall.error} />
        ) : (
          <div className="space-y-3">
            {result.pipelines.waterfall.data?.company && (
              <div>
                <h4 className="text-xs font-semibold mb-1">
                  Company Enrichment
                </h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {Object.entries(
                    result.pipelines.waterfall.data.company
                  ).map(([k, v]) =>
                    v != null ? (
                      <div key={k} className="contents">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="truncate">{String(v)}</dd>
                      </div>
                    ) : null
                  )}
                </dl>
              </div>
            )}
            {result.pipelines.waterfall.data?.searchGroups && (
              <div>
                <h4 className="text-xs font-semibold mb-1">
                  Search Groups
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.pipelines.waterfall.data.searchGroups.map(
                    (g) => (
                      <Badge
                        key={g.label}
                        variant={
                          g.status === "ok" ? "secondary" : "destructive"
                        }
                        className="text-xs"
                      >
                        {g.label}: {g.personCount}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            )}
            {(result.pipelines.waterfall.data?.persons.length ?? 0) > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-1">
                  People ({result.pipelines.waterfall.data!.persons.length}{" "}
                  deduped)
                </h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="pb-1">Name</th>
                      <th className="pb-1">Title</th>
                      <th className="pb-1">Email</th>
                      <th className="pb-1">LinkedIn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.pipelines.waterfall.data!.persons.map(
                      (p, i) => (
                        <tr key={i} className="border-b border-dashed">
                          <td className="py-1">
                            {p.first_name} {p.last_name}
                          </td>
                          <td className="py-1 text-muted-foreground">
                            {p.title}
                          </td>
                          <td className="py-1">
                            {p.email && (
                              <span>
                                {p.email}{" "}
                                {p.email_verified && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    ✓
                                  </Badge>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="py-1">
                            {p.linkedin_url && (
                              <a
                                href={p.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                profile
                              </a>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Saber removed */}

      {/* --- Google Places: Locations --- */}
      <Section
        title={`Google Places: ${result.pipelines.googlePlaces.data?.locations.length ?? 0} Locations`}
      >
        {result.pipelines.googlePlaces.status === "error" ? (
          <Err msg={result.pipelines.googlePlaces.error} />
        ) : (
          <div className="space-y-2">
            {result.pipelines.googlePlaces.data?.locations.map((loc) => (
              <div
                key={loc.placeId}
                className="flex justify-between border-b border-dashed pb-1"
              >
                <div>
                  <span className="font-semibold">{loc.displayName}</span>
                  <span className="text-muted-foreground ml-2">
                    {loc.formattedAddress}
                  </span>
                </div>
                {loc.websiteUri && (
                  <a
                    href={loc.websiteUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline text-muted-foreground"
                  >
                    {new URL(loc.websiteUri).hostname}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* --- Google Places: Details per location --- */}
      {result.pipelines.googlePlaces.data?.details.map((detail) => (
        <Section
          key={detail.placeId}
          title={`GP: ${detail.displayName} — ${detail.data?.rating ?? "?"}/5 (${detail.data?.userRatingCount ?? 0} reviews, ${detail.data?.reviews.length ?? 0} fetched)`}
        >
          {detail.status === "error" ? (
            <Err msg={detail.error} />
          ) : detail.data ? (
            <div className="space-y-3">
              {detail.data.reviews.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-1">
                    Reviews ({detail.data.reviews.length})
                  </h4>
                  {detail.data.reviews.map((review, i) => (
                    <div key={i} className="border-b border-dashed py-1">
                      <div className="flex gap-2 text-xs">
                        <span>{"★".repeat(review.rating)}</span>
                        <span className="font-semibold">
                          {review.authorName}
                        </span>
                        <span className="text-muted-foreground">
                          {review.relativePublishTimeDescription}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5">{review.text}</p>
                    </div>
                  ))}
                </div>
              )}
              {detail.data.photos.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-1">
                    Photos ({detail.data.photos.length})
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {detail.data.photos.slice(0, 4).map((photo) => (
                      <img
                        key={photo.name}
                        src={`/api/places/photo?name=${encodeURIComponent(photo.name)}&maxWidthPx=200`}
                        alt=""
                        className="h-24 w-auto rounded"
                        loading="lazy"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </Section>
      ))}

      {/* --- Outscraper: Reviews per location --- */}
      {result.pipelines.outscraper.data?.reviews.map((review) => (
        <Section
          key={review.placeId}
          title={`Outscraper: ${review.displayName} — ${review.data?.reviews_data?.length ?? 0} reviews`}
        >
          {review.status === "error" ? (
            <Err msg={review.error} />
          ) : review.data?.reviews_data ? (
            <div>
              <div className="flex gap-4 mb-2 text-xs text-muted-foreground">
                <span>Rating: {review.data.rating}/5</span>
                <span>Total reviews: {review.data.reviews}</span>
                <span>Fetched: {review.data.reviews_data.length}</span>
              </div>
              {review.data.reviews_data.map((r, i) => (
                <div key={i} className="border-b border-dashed py-1">
                  <div className="flex gap-2 text-xs">
                    <span>{"★".repeat(r.review_rating)}</span>
                    <span className="font-semibold">{r.autor_name}</span>
                    <span className="text-muted-foreground">
                      {r.review_datetime_utc}
                    </span>
                    {r.review_likes > 0 && (
                      <span className="text-muted-foreground">
                        👍 {r.review_likes}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5">{r.review_text}</p>
                  {r.owner_answer && (
                    <p className="text-xs mt-0.5 pl-4 text-muted-foreground italic">
                      Owner reply: {r.owner_answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No reviews</p>
          )}
        </Section>
      ))}

      {/* --- Raw JSON --- */}
      <div className="mt-6">
        <label className="flex items-center gap-2 cursor-pointer text-xs mb-2">
          <input
            type="checkbox"
            checked={showRaw}
            onChange={(e) => setShowRaw(e.target.checked)}
          />
          Show raw JSON
        </label>
        {showRaw && (
          <pre className="bg-muted p-4 rounded overflow-auto max-h-[600px] text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// --- Google Maps Tab ---
// Pipeline: Autocomplete → Chain Discovery → Review Collection → AI Analysis → Final Output

interface ReviewProgress {
  placeId: string;
  displayName: string;
  reviewCount: number;
  sort?: string;
}

interface BatchAnalysisEvent {
  placeId: string;
  displayName: string;
  batchIndex: number;
  mentions: StaffMention[];
  namedEmployees: string[];
}

interface PipelineTiming {
  label: string;
  startedAt: number;
  durationMs?: number;
  status?: "running" | "done" | "error";
  detail?: string;
}

interface TimingEvent {
  id: string;
  label: string;
  startMs: number;
  endMs: number;
  detail?: string;
  parent?: string;
  error?: boolean;
}

function readSSE(
  res: Response,
  handlers: Record<string, (data: unknown) => void>
) {
  return (async () => {
    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      let currentEvent = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ") && currentEvent) {
          const data = JSON.parse(line.slice(6));
          handlers[currentEvent]?.(data);
        }
      }
    }
  })();
}

function GoogleMapsTab() {
  // Sub-tab
  const [gmapsView, setGmapsView] = useState<"scan" | "history" | "chain">("scan");

  // Chain discovery state
  const [chainPlace, setChainPlace] = useState<PlaceSummary | null>(null);
  const [chainRunning, setChainRunning] = useState(false);
  const [chainResults, setChainResults] = useState<StrategyResult[] | null>(null);
  const [chainTotalMs, setChainTotalMs] = useState(0);
  const [chainError, setChainError] = useState<string | null>(null);

  // Chain discovery history
  const [chainRuns, setChainRuns] = useState<ChainRunSummary[]>([]);
  const [chainRunsLoading, setChainRunsLoading] = useState(true);
  const [selectedChainRun, setSelectedChainRun] = useState<ChainRunDetail | null>(null);
  const [loadingChainRunId, setLoadingChainRunId] = useState<string | null>(null);
  const [chainSubView, setChainSubView] = useState<"new" | "history">("new");

  // History state
  const [scanRuns, setScanRuns] = useState<ScanRunSummary[]>([]);
  const [scanRunsLoading, setScanRunsLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<ScanRunDetail | null>(null);
  const [loadingRunId, setLoadingRunId] = useState<string | null>(null);

  // Pipeline state
  const [place, setPlace] = useState<PlaceSummary | null>(null);
  const [running, setRunning] = useState(false);
  const pipelineStart = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stage 1: Chain discovery
  const [scanChainLocs, setScanChainLocs] = useState<PlaceSummary[] | null>(null);
  const [scanChainDur, setScanChainDur] = useState<number | null>(null);
  const [scanChainErr, setScanChainErr] = useState<string | null>(null);

  // Stage 2: Review collection
  const [reviewProgress, setReviewProgress] = useState<ReviewProgress[]>([]);

  // Stage 3: AI analysis batches
  const [batches, setBatches] = useState<BatchAnalysisEvent[]>([]);
  const [allMentions, setAllMentions] = useState<StaffMention[]>([]);

  // Stage 3b: Preliminary analysis (fires as soon as first batch lands)
  const [prelimAnalysis, setPrelimAnalysis] = useState<StaffAnalysis | null>(null);

  // Stage 4: Final merged result
  const [staffAnalysis, setStaffAnalysis] = useState<StaffAnalysis | null>(null);
  const [locationDetails, setLocationDetails] = useState<PlaceDetails[]>([]);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Timing log
  const [timings, setTimings] = useState<PipelineTiming[]>([]);
  const [serverTimings, setServerTimings] = useState<TimingEvent[]>([]);
  const [showRawMentions, setShowRawMentions] = useState(false);

  // Fetch scan runs + chain runs on mount
  useEffect(() => {
    fetchScanRuns();
    fetchChainRuns();
  }, []);

  async function fetchScanRuns() {
    setScanRunsLoading(true);
    try {
      const res = await fetch("/api/data/scan-runs");
      if (res.ok) setScanRuns(await res.json());
    } catch {
      // silently fail
    } finally {
      setScanRunsLoading(false);
    }
  }

  async function loadScanRun(id: string) {
    setLoadingRunId(id);
    try {
      const res = await fetch(`/api/data/scan-runs?id=${id}`);
      if (!res.ok) throw new Error("Failed to load");
      const data: ScanRunDetail = await res.json();
      setSelectedRun(data);
    } catch {
      setSelectedRun(null);
    } finally {
      setLoadingRunId(null);
    }
  }

  function addTiming(t: PipelineTiming) {
    setTimings((prev) => [...prev, t]);
  }

  function updateTiming(label: string, update: Partial<PipelineTiming>) {
    setTimings((prev) =>
      prev.map((t) => (t.label === label ? { ...t, ...update } : t))
    );
  }

  function reset() {
    setScanChainLocs(null);
    setScanChainDur(null);
    setScanChainErr(null);
    setReviewProgress([]);
    setBatches([]);
    setAllMentions([]);
    setPrelimAnalysis(null);
    setStaffAnalysis(null);
    setLocationDetails([]);
    setAnalysisDone(false);
    setAnalysisError(null);
    setTimings([]);
    setServerTimings([]);
    setElapsed(0);
    setShowRawMentions(false);
  }

  // Persist run to Supabase
  async function persistRun(
    selected: PlaceSummary,
    totalMs: number,
    chainCount: number,
    reviews: number,
    mentions: StaffMention[],
    analysis: StaffAnalysis | null,
    details: PlaceDetails[]
  ) {
    const pos = mentions.filter((m) => m.sentiment === "positive").length;
    const neg = mentions.filter((m) => m.sentiment === "negative").length;
    const named = [...new Set(mentions.flatMap((m) => m.staffNames))].length;
    try {
      await fetch("/api/data/scan-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          place_id: selected.placeId,
          display_name: selected.displayName,
          total_duration_ms: totalMs,
          chain_locations_count: chainCount,
          reviews_collected: reviews,
          mentions_count: mentions.length,
          positive_count: pos,
          negative_count: neg,
          named_employees_count: named,
          locations_scanned: details.length || 1,
          result: {
            place: selected,
            staffAnalysis: analysis,
            locationDetails: details,
            mentions,
          },
        }),
      });
      fetchScanRuns();
    } catch {
      // fire-and-forget
    }
  }

  async function handleChainDiscovery(selected: PlaceSummary) {
    setChainPlace(selected);
    setChainRunning(true);
    setChainResults(null);
    setChainError(null);
    setChainTotalMs(0);
    try {
      const res = await fetch("/api/data/chain-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: selected.displayName,
          websiteUri: selected.websiteUri,
          placeId: selected.placeId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setChainResults(data.strategies);
      setChainTotalMs(data.totalDurationMs);

      // Auto-persist
      const strategies = data.strategies as StrategyResult[];
      const best = strategies.reduce((a, b) => (b.filteredCount > a.filteredCount ? b : a), strategies[0]);
      const seen = new Set<string>();
      for (const s of strategies) for (const loc of s.results) seen.add(loc.placeId);

      let websiteDomain: string | null = null;
      if (selected.websiteUri) {
        try { websiteDomain = new URL(selected.websiteUri).hostname.replace("www.", ""); } catch { /* */ }
      }

      fetch("/api/data/chain-discovery-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          place_id: selected.placeId,
          display_name: selected.displayName,
          website_domain: websiteDomain,
          total_duration_ms: data.totalDurationMs,
          strategy_count: strategies.length,
          best_strategy: best?.label ?? null,
          best_filtered_count: best?.filteredCount ?? 0,
          union_count: seen.size,
          result: data,
        }),
      })
        .then(() => fetchChainRuns())
        .catch(() => {});
    } catch (err) {
      setChainError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setChainRunning(false);
    }
  }

  async function fetchChainRuns() {
    try {
      const res = await fetch("/api/data/chain-discovery-runs");
      if (res.ok) setChainRuns(await res.json());
    } catch { /* */ }
    setChainRunsLoading(false);
  }

  async function loadChainRun(id: string) {
    setLoadingChainRunId(id);
    try {
      const res = await fetch(`/api/data/chain-discovery-runs?id=${id}`);
      if (res.ok) setSelectedChainRun(await res.json());
    } catch { /* */ }
    setLoadingChainRunId(null);
  }

  function handlePlaceSelected(selected: PlaceSummary) {
    reset();
    setPlace(selected);
    setRunning(true);
    setGmapsView("scan");
    pipelineStart.current = Date.now();

    // Refs to capture final state for persistence
    const capturedChainCount = { value: 0 };
    const capturedReviews = { value: 0 };
    const capturedReviewsByPlace: Record<string, number> = {};
    const capturedMentions: StaffMention[] = [];
    let capturedAnalysis: StaffAnalysis | null = null;
    let capturedDetails: PlaceDetails[] = [];

    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - pipelineStart.current);
    }, 100);

    const t0 = Date.now();

    // --- Stream 1: Chain discovery ---
    const chainStart = Date.now();
    addTiming({ label: "Chain discovery", startedAt: chainStart, status: "running" });

    fetch("/api/demo/scan/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: selected.displayName,
        websiteUri: selected.websiteUri,
      }),
    })
      .then((res) =>
        readSSE(res, {
          locations: (data) => {
            const locs = data as PlaceSummary[];
            const others = locs.filter((l) => l.placeId !== selected.placeId);
            setScanChainLocs(others);
            capturedChainCount.value = others.length;
            const dur = Date.now() - chainStart;
            setScanChainDur(dur);
            updateTiming("Chain discovery", {
              durationMs: dur,
              status: "done",
              detail: `${others.length} other location${others.length === 1 ? "" : "s"}`,
            });
          },
        })
      )
      .catch((err) => {
        setScanChainErr(String(err));
        updateTiming("Chain discovery", {
          durationMs: Date.now() - chainStart,
          status: "error",
          detail: String(err),
        });
      });

    // --- Stream 2: Analyze primary location ---
    const analyzeStart = Date.now();
    addTiming({
      label: "Primary analysis",
      startedAt: analyzeStart,
      status: "running",
      detail: selected.displayName,
    });

    fetch("/api/demo/scan/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations: [selected] }),
    })
      .then((res) =>
        readSSE(res, {
          reviews_progress: (data) => {
            const rp = data as ReviewProgress;
            // reviewCount is cumulative per location — track latest per placeId
            capturedReviewsByPlace[rp.placeId] = rp.reviewCount;
            capturedReviews.value = Object.values(capturedReviewsByPlace).reduce((a, b) => a + b, 0);
            setReviewProgress((prev) => {
              // Replace any existing entry for this placeId with latest count
              const without = prev.filter((p) => p.placeId !== rp.placeId);
              return [...without, rp];
            });
            updateTiming("Primary analysis", {
              detail: `${rp.reviewCount} reviews from ${rp.displayName}${rp.sort ? ` (${rp.sort})` : ""}`,
            });
          },
          batch_analysis: (data) => {
            const ba = data as BatchAnalysisEvent;
            capturedMentions.push(...ba.mentions);
            setBatches((prev) => [...prev, ba]);
            setAllMentions((prev) => [...prev, ...ba.mentions]);
          },
          timing: (data) => {
            setServerTimings((prev) => [...prev, data as TimingEvent]);
          },
          preliminary_analysis: (data) => {
            setPrelimAnalysis(data as StaffAnalysis);
            updateTiming("Primary analysis", {
              detail: "Preliminary results ready",
            });
          },
          analysis: (data) => {
            capturedAnalysis = data as StaffAnalysis;
            setStaffAnalysis(data as StaffAnalysis);
            setPrelimAnalysis(null); // final replaces preliminary
          },
          details: (data) => {
            capturedDetails = data as PlaceDetails[];
            setLocationDetails(data as PlaceDetails[]);
          },
          done: () => {
            const totalMs = Date.now() - t0;
            updateTiming("Primary analysis", {
              durationMs: Date.now() - analyzeStart,
              status: "done",
            });
            setAnalysisDone(true);
            setRunning(false);
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            setElapsed(totalMs);
            // Persist
            persistRun(
              selected,
              totalMs,
              capturedChainCount.value,
              capturedReviews.value,
              capturedMentions,
              capturedAnalysis,
              capturedDetails
            );
          },
          error: (data) => {
            const msg = (data as { message: string }).message;
            setAnalysisError(msg);
            updateTiming("Primary analysis", {
              durationMs: Date.now() - analyzeStart,
              status: "error",
              detail: msg,
            });
            setRunning(false);
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
          },
        })
      )
      .catch((err) => {
        setAnalysisError(String(err));
        setRunning(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      });
  }

  const totalReviews = reviewProgress.reduce((s, rp) => s + rp.reviewCount, 0);
  const positiveMentions = allMentions.filter((m) => m.sentiment === "positive");
  const negativeMentions = allMentions.filter((m) => m.sentiment === "negative");

  // Hydrate view from a loaded historical run
  const viewResult = selectedRun?.result as {
    place?: PlaceSummary;
    staffAnalysis?: StaffAnalysis | null;
    locationDetails?: PlaceDetails[];
    mentions?: StaffMention[];
  } | null;

  return (
    <div className="space-y-4">
      {/* --- Sub-tabs --- */}
      <div className="flex gap-1 border-b mb-2">
        <button
          onClick={() => setGmapsView("scan")}
          className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
            gmapsView === "scan"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          New Scan
        </button>
        <button
          onClick={() => setGmapsView("history")}
          className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
            gmapsView === "history"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          History ({scanRuns.length})
        </button>
        <button
          onClick={() => setGmapsView("chain")}
          className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
            gmapsView === "chain"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Chain Discovery
        </button>
      </div>

      {/* ========== HISTORY VIEW ========== */}
      {gmapsView === "history" && (
        <div className="space-y-4">
          {scanRunsLoading ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : scanRuns.length === 0 ? (
            <p className="text-xs text-muted-foreground">No scan runs yet. Run a scan to see results here.</p>
          ) : (
            <>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-1">Business</th>
                    <th className="pb-1">Locations</th>
                    <th className="pb-1">Reviews</th>
                    <th className="pb-1">Mentions</th>
                    <th className="pb-1">+/-</th>
                    <th className="pb-1">Named</th>
                    <th className="pb-1 text-right">Duration</th>
                    <th className="pb-1 text-right">When</th>
                    <th className="pb-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {scanRuns.map((run) => (
                    <tr
                      key={run.id}
                      className={`border-b border-dashed cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedRun?.id === run.id ? "bg-muted/50" : ""
                      }`}
                      onClick={() => loadScanRun(run.id)}
                    >
                      <td className="py-1.5 font-semibold">{run.display_name}</td>
                      <td className="py-1.5">{run.locations_scanned}</td>
                      <td className="py-1.5">{run.reviews_collected}</td>
                      <td className="py-1.5">{run.mentions_count}</td>
                      <td className="py-1.5">
                        <span className="text-green-700">{run.positive_count}</span>
                        {" / "}
                        <span className="text-amber-700">{run.negative_count}</span>
                      </td>
                      <td className="py-1.5">{run.named_employees_count}</td>
                      <td className="py-1.5 text-right">
                        {(run.total_duration_ms / 1000).toFixed(1)}s
                      </td>
                      <td className="py-1.5 text-right text-muted-foreground">
                        {formatRelativeTime(run.created_at)}
                      </td>
                      <td className="py-1.5 text-right">
                        {loadingRunId === run.id && (
                          <span className="text-muted-foreground">loading…</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Loaded run detail */}
              {selectedRun && viewResult && (
                <div className="space-y-4">
                  <div className="text-xs text-muted-foreground">
                    Viewing: <span className="font-semibold text-foreground">{selectedRun.display_name}</span>
                    {" · "}{selectedRun.total_duration_ms ? `${(selectedRun.total_duration_ms / 1000).toFixed(1)}s` : ""}
                    {" · "}<code className="text-[10px]">{selectedRun.place_id}</code>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-6 gap-3">
                    <StatCard label="Reviews" value={selectedRun.reviews_collected} />
                    <StatCard label="Mentions" value={selectedRun.mentions_count} />
                    <StatCard label="Positive" value={selectedRun.positive_count} />
                    <StatCard label="Negative" value={selectedRun.negative_count} />
                    <StatCard label="Named" value={selectedRun.named_employees_count} />
                    <StatCard label="Locations" value={selectedRun.locations_scanned} />
                  </div>

                  {/* Headline */}
                  {viewResult.staffAnalysis && (
                    <Section title="Merged Analysis" defaultOpen>
                      <div className="border rounded p-4 bg-muted/30">
                        <h3 className="text-base font-bold">&ldquo;{viewResult.staffAnalysis.headline}&rdquo;</h3>
                        <p className="text-xs text-muted-foreground mt-1">{viewResult.staffAnalysis.body}</p>
                        {viewResult.staffAnalysis.standoutEmployee && (
                          <p className="text-xs mt-2">
                            Standout: <span className="font-semibold text-primary">{viewResult.staffAnalysis.standoutEmployee}</span>
                          </p>
                        )}
                      </div>
                      {(viewResult.staffAnalysis.namedEmployees?.length ?? 0) > 0 && (
                        <div className="mt-3">
                          <h4 className="text-xs font-semibold mb-1">Named Employees</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {(viewResult.staffAnalysis.namedEmployees ?? []).map((name) => {
                              const count = (viewResult.staffAnalysis!.mentions ?? []).filter((m) =>
                                (m.staffNames ?? []).includes(name)
                              ).length;
                              return (
                                <Badge key={name} variant="secondary" className="text-xs">
                                  {name} ({count})
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </Section>
                  )}

                  {/* All mentions */}
                  {(viewResult.mentions?.length ?? 0) > 0 && (
                    <Section title={`Mentions (${viewResult.mentions!.length})`}>
                      <div className="max-h-[400px] overflow-y-auto">
                        {viewResult.mentions!.map((m, i) => (
                          <div key={i} className="border-b border-dashed py-1.5">
                            <div className="flex gap-2 text-xs">
                              <span>{"★".repeat(m.reviewRating)}</span>
                              <Badge
                                variant={m.sentiment === "positive" ? "default" : "destructive"}
                                className="text-[10px]"
                              >
                                {m.sentiment}
                              </Badge>
                              <span className="font-semibold">{m.reviewAuthor}</span>
                              <span className="text-muted-foreground">{m.locationName}</span>
                              {(m.staffNames?.length ?? 0) > 0 && (
                                <span className="text-primary font-semibold">
                                  [{(m.staffNames ?? []).join(", ")}]
                                </span>
                              )}
                            </div>
                            <p className="text-xs mt-0.5 italic">{m.relevantExcerpt}</p>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Locations */}
                  {(viewResult.locationDetails?.length ?? 0) > 0 && (
                    <Section title={`Locations (${viewResult.locationDetails!.length})`}>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b">
                            <th className="pb-1">Name</th>
                            <th className="pb-1">Address</th>
                            <th className="pb-1">Rating</th>
                            <th className="pb-1">Reviews</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewResult.locationDetails!.map((loc) => (
                            <tr key={loc.placeId} className="border-b border-dashed">
                              <td className="py-1 font-semibold">{loc.displayName}</td>
                              <td className="py-1 text-muted-foreground truncate max-w-[200px]">{loc.formattedAddress}</td>
                              <td className="py-1">{loc.rating?.toFixed(1) ?? "—"}</td>
                              <td className="py-1">{loc.userRatingCount ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Section>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========== CHAIN DISCOVERY VIEW ========== */}
      {gmapsView === "chain" && (
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-2 border-b pb-2">
            {(["new", "history"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setChainSubView(v)}
                className={`px-3 py-1 text-xs rounded-t font-medium transition-colors ${
                  chainSubView === v
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "new" ? "New Discovery" : `History (${chainRuns.length})`}
              </button>
            ))}
          </div>

          {/* --- HISTORY SUB-VIEW --- */}
          {chainSubView === "history" && (
            <div className="space-y-4">
              {chainRunsLoading ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : chainRuns.length === 0 ? (
                <p className="text-xs text-muted-foreground">No chain discovery runs yet.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="pb-1">Business</th>
                      <th className="pb-1">Domain</th>
                      <th className="pb-1 text-right">Strategies</th>
                      <th className="pb-1 text-right">Best</th>
                      <th className="pb-1 text-right">Union</th>
                      <th className="pb-1 text-right">Duration</th>
                      <th className="pb-1">Date</th>
                      <th className="pb-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {chainRuns.map((run) => (
                      <tr key={run.id} className="border-b border-dashed">
                        <td className="py-1.5 font-semibold">{run.display_name}</td>
                        <td className="py-1.5 text-muted-foreground font-mono">{run.website_domain ?? "—"}</td>
                        <td className="py-1.5 text-right">{run.strategy_count}</td>
                        <td className="py-1.5 text-right">
                          {run.best_filtered_count}
                          {run.best_strategy && (
                            <span className="text-muted-foreground ml-1 text-[10px]">({run.best_strategy})</span>
                          )}
                        </td>
                        <td className="py-1.5 text-right font-semibold">{run.union_count}</td>
                        <td className="py-1.5 text-right">{(run.total_duration_ms / 1000).toFixed(1)}s</td>
                        <td className="py-1.5 text-muted-foreground">
                          {new Date(run.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-2 text-[10px]"
                            onClick={() => loadChainRun(run.id)}
                            disabled={loadingChainRunId === run.id}
                          >
                            {loadingChainRunId === run.id ? "…" : "View"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Expanded run detail */}
              {selectedChainRun && (
                <div className="space-y-3 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {selectedChainRun.display_name}
                      <span className="text-muted-foreground font-normal ml-2 text-xs">
                        {new Date(selectedChainRun.created_at).toLocaleString()}
                      </span>
                    </h3>
                    <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px]" onClick={() => setSelectedChainRun(null)}>
                      Close
                    </Button>
                  </div>
                  {(() => {
                    const result = selectedChainRun.result as { strategies?: StrategyResult[] };
                    const strategies = result?.strategies ?? [];
                    if (strategies.length === 0) return <p className="text-xs text-muted-foreground">No strategy data.</p>;

                    return (
                      <>
                        <Section title="Strategy Comparison" defaultOpen>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-muted-foreground border-b">
                                <th className="pb-1">Strategy</th>
                                <th className="pb-1">Filter</th>
                                <th className="pb-1 text-right">Raw</th>
                                <th className="pb-1 text-right">Filtered</th>
                                <th className="pb-1 text-right">Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {strategies.map((s, i) => (
                                <tr key={i} className="border-b border-dashed">
                                  <td className="py-1.5 font-semibold">{s.label}</td>
                                  <td className="py-1.5">
                                    <Badge variant="secondary" className="text-[10px]">{s.config.filterMode}</Badge>
                                  </td>
                                  <td className="py-1.5 text-right">{s.rawCount}</td>
                                  <td className="py-1.5 text-right font-semibold">{s.filteredCount}</td>
                                  <td className="py-1.5 text-right">{(s.durationMs / 1000).toFixed(1)}s</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </Section>

                        {strategies.map((s, i) => (
                          <Section key={i} title={`${s.label} — ${s.filteredCount} locations`} defaultOpen={i === 0}>
                            {s.results.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No locations passed filter.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-muted-foreground border-b">
                                    <th className="pb-1">Name</th>
                                    <th className="pb-1">Address</th>
                                    <th className="pb-1">Website</th>
                                    <th className="pb-1 text-right">Reviews</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {s.results.map((loc) => (
                                    <tr key={loc.placeId} className="border-b border-dashed">
                                      <td className="py-1 font-semibold">{loc.displayName}</td>
                                      <td className="py-1 text-muted-foreground truncate max-w-[200px]">{loc.formattedAddress}</td>
                                      <td className="py-1 text-muted-foreground truncate max-w-[120px]">
                                        {loc.websiteUri ? new URL(loc.websiteUri).hostname : "—"}
                                      </td>
                                      <td className="py-1 text-right">{loc.userRatingCount ?? 0}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </Section>
                        ))}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* --- NEW DISCOVERY SUB-VIEW --- */}
          {chainSubView === "new" && (
            <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-80">
              <LocationAutocomplete
                onPlaceSelected={handleChainDiscovery}
                placeholder="Search for a business..."
                className="h-9 rounded border border-input bg-background font-mono text-xs"
              />
            </div>
            {chainRunning && (
              <span className="text-xs text-muted-foreground">Running all strategies in parallel…</span>
            )}
            {!chainRunning && chainResults && (
              <span className="text-xs text-muted-foreground">
                Done in {(chainTotalMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>

          {chainPlace && (
            <div className="text-xs text-muted-foreground">
              Selected: <span className="font-semibold text-foreground">{chainPlace.displayName}</span>
              {" · "}{chainPlace.formattedAddress}
              {chainPlace.websiteUri && <>{" · "}<code className="text-[10px]">{new URL(chainPlace.websiteUri).hostname}</code></>}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Runs 5 strategies in parallel against the same business: varies query construction,
            regional targeting, and post-filter logic. Compare which approach finds the most (correct) locations.
          </p>

          {chainError && <Err msg={chainError} />}

          {/* Comparison table */}
          {chainResults && (
            <>
              <Section title="Strategy Comparison" defaultOpen>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="pb-1">Strategy</th>
                      <th className="pb-1">Queries</th>
                      <th className="pb-1">Regions</th>
                      <th className="pb-1">Filter</th>
                      <th className="pb-1 text-right">Raw</th>
                      <th className="pb-1 text-right">Filtered</th>
                      <th className="pb-1 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chainResults.map((s, i) => (
                      <tr key={i} className="border-b border-dashed">
                        <td className="py-1.5 font-semibold">{s.label}</td>
                        <td className="py-1.5 text-muted-foreground max-w-[150px] truncate">
                          {s.config.queries.join(", ")}
                        </td>
                        <td className="py-1.5 text-muted-foreground">
                          {s.config.regions.join(", ")}
                        </td>
                        <td className="py-1.5">
                          <Badge variant="secondary" className="text-[10px]">
                            {s.config.filterMode}
                          </Badge>
                        </td>
                        <td className="py-1.5 text-right">{s.rawCount}</td>
                        <td className="py-1.5 text-right font-semibold">{s.filteredCount}</td>
                        <td className="py-1.5 text-right">{(s.durationMs / 1000).toFixed(1)}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>

              {/* Per-strategy detail */}
              {chainResults.map((s, i) => (
                <Section
                  key={i}
                  title={`${s.label} — ${s.filteredCount} locations`}
                  defaultOpen={i === 0}
                >
                  {/* Search breakdown */}
                  <h4 className="text-xs font-semibold mb-1">Search Calls</h4>
                  <table className="w-full text-xs mb-3">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="pb-1">Query</th>
                        <th className="pb-1">Region</th>
                        <th className="pb-1 text-right">Results</th>
                        <th className="pb-1 text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.searches.map((search, j) => (
                        <tr key={j} className="border-b border-dashed">
                          <td className="py-1 font-mono">{search.query}</td>
                          <td className="py-1 text-muted-foreground">{search.region}</td>
                          <td className="py-1 text-right">{search.count}</td>
                          <td className="py-1 text-right">{(search.durationMs / 1000).toFixed(1)}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Results */}
                  {s.results.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No locations passed filter.</p>
                  ) : (
                    <>
                      <h4 className="text-xs font-semibold mb-1">Locations ({s.results.length})</h4>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b">
                            <th className="pb-1">Name</th>
                            <th className="pb-1">Address</th>
                            <th className="pb-1">Website</th>
                            <th className="pb-1 text-right">Reviews</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.results.map((loc) => (
                            <tr key={loc.placeId} className="border-b border-dashed">
                              <td className="py-1 font-semibold">{loc.displayName}</td>
                              <td className="py-1 text-muted-foreground truncate max-w-[200px]">{loc.formattedAddress}</td>
                              <td className="py-1 text-muted-foreground truncate max-w-[120px]">
                                {loc.websiteUri ? new URL(loc.websiteUri).hostname : "—"}
                              </td>
                              <td className="py-1 text-right">{loc.userRatingCount ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </Section>
              ))}

              {/* Unique locations across all strategies */}
              <Section title="Union — All Unique Locations" defaultOpen>
                {(() => {
                  const seen = new Set<string>();
                  const union: (PlaceSummary & { foundBy: string[] })[] = [];
                  for (const s of chainResults) {
                    for (const loc of s.results) {
                      if (!seen.has(loc.placeId)) {
                        seen.add(loc.placeId);
                        union.push({ ...loc, foundBy: [s.label] });
                      } else {
                        const existing = union.find((u) => u.placeId === loc.placeId);
                        if (existing) existing.foundBy.push(s.label);
                      }
                    }
                  }
                  return (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b">
                          <th className="pb-1">Name</th>
                          <th className="pb-1">Address</th>
                          <th className="pb-1">Website</th>
                          <th className="pb-1 text-right">Reviews</th>
                          <th className="pb-1">Found By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {union.map((loc) => (
                          <tr key={loc.placeId} className="border-b border-dashed">
                            <td className="py-1 font-semibold">{loc.displayName}</td>
                            <td className="py-1 text-muted-foreground truncate max-w-[180px]">{loc.formattedAddress}</td>
                            <td className="py-1 text-muted-foreground truncate max-w-[120px]">
                              {loc.websiteUri ? new URL(loc.websiteUri).hostname : "—"}
                            </td>
                            <td className="py-1 text-right">{loc.userRatingCount ?? 0}</td>
                            <td className="py-1">
                              <span className="text-[10px] text-muted-foreground">
                                {loc.foundBy.length}/{chainResults.length}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </Section>
            </>
          )}
            </div>
          )}
        </div>
      )}

      {/* ========== NEW SCAN VIEW ========== */}
      {gmapsView === "scan" && (
        <div className="space-y-4">
          {/* --- Search input --- */}
          <div className="flex items-center gap-4">
            <div className="w-80">
              <LocationAutocomplete
                onPlaceSelected={handlePlaceSelected}
                placeholder="Search for a business..."
                className="h-9 rounded border border-input bg-background font-mono text-xs"
              />
            </div>
            {running && (
              <span className="text-xs text-muted-foreground">
                Running… {(elapsed / 1000).toFixed(1)}s
              </span>
            )}
            {!running && analysisDone && (
              <span className="text-xs text-muted-foreground">
                Done in {(elapsed / 1000).toFixed(1)}s
              </span>
            )}
          </div>

          {place && (
            <div className="text-xs text-muted-foreground">
              Selected: <span className="font-semibold text-foreground">{place.displayName}</span>
              {" · "}{place.formattedAddress}
              {" · "}<code className="text-[10px]">{place.placeId}</code>
            </div>
          )}

          {/* --- Pipeline timing waterfall --- */}
          {(timings.length > 0 || serverTimings.length > 0) && (
            <Section title={`Pipeline Timing — ${(elapsed / 1000).toFixed(1)}s`} defaultOpen>
              {/* Client-side high-level timings */}
              <div className="flex gap-2 mb-3 text-xs">
                {timings.map((t) => (
                  <span key={t.label} className="flex items-center gap-1.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      t.status === "running" ? "bg-yellow-500 animate-pulse" :
                      t.status === "error" ? "bg-red-500" : "bg-green-500"
                    }`} />
                    <span className="font-medium">{t.label}</span>
                    {t.durationMs != null && (
                      <span className="text-muted-foreground">{(t.durationMs / 1000).toFixed(1)}s</span>
                    )}
                  </span>
                ))}
              </div>

              {/* Server-side waterfall */}
              {serverTimings.length > 0 && (() => {
                const totalMs = Math.max(...serverTimings.map((t) => t.endMs), 1);
                // Sort: parent events first (location), then by startMs
                const sorted = [...serverTimings]
                  .filter((t) => t.id !== "total")
                  .sort((a, b) => {
                    // Group by category for visual clarity
                    const order = (id: string) => {
                      if (id === "place_details") return 0;
                      if (id.startsWith("outscraper_")) return 1;
                      if (id.startsWith("haiku_batch_")) return 2;
                      if (id === "preliminary_merge") return 3;
                      if (id === "final_merge") return 4;
                      if (id.startsWith("location_")) return 5;
                      return 6;
                    };
                    const oa = order(a.id);
                    const ob = order(b.id);
                    if (oa !== ob) return oa - ob;
                    return a.startMs - b.startMs;
                  });

                const barColor = (id: string) => {
                  if (id === "place_details") return "bg-blue-500";
                  if (id.startsWith("outscraper_")) return "bg-amber-500";
                  if (id.startsWith("haiku_batch_")) return "bg-violet-500";
                  if (id.includes("merge")) return "bg-emerald-500";
                  if (id.startsWith("location_")) return "bg-slate-400";
                  return "bg-gray-400";
                };

                return (
                  <div className="space-y-0">
                    {/* Time axis */}
                    <div className="flex items-center mb-1">
                      <div className="w-[180px] shrink-0" />
                      <div className="flex-1 relative h-4">
                        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                          <span
                            key={pct}
                            className="absolute text-[9px] text-muted-foreground -translate-x-1/2"
                            style={{ left: `${pct * 100}%` }}
                          >
                            {(totalMs * pct / 1000).toFixed(0)}s
                          </span>
                        ))}
                      </div>
                      <div className="w-[70px] shrink-0" />
                    </div>

                    {/* Bars */}
                    {sorted.map((t) => {
                      const leftPct = (t.startMs / totalMs) * 100;
                      const widthPct = Math.max(((t.endMs - t.startMs) / totalMs) * 100, 0.5);
                      const durationS = ((t.endMs - t.startMs) / 1000).toFixed(1);

                      return (
                        <div key={t.id} className="flex items-center group hover:bg-muted/30 rounded">
                          <div className="w-[180px] shrink-0 text-[10px] truncate pr-2 text-right" title={t.detail}>
                            <span className={`font-medium ${t.error ? "text-red-500" : ""}`}>{t.label}</span>
                          </div>
                          <div className="flex-1 relative h-5">
                            <div
                              className={`absolute top-1 h-3 rounded-sm ${t.error ? "bg-red-400" : barColor(t.id)} opacity-80`}
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                            />
                          </div>
                          <div className="w-[70px] shrink-0 text-[10px] text-right text-muted-foreground tabular-nums">
                            {durationS}s
                          </div>
                        </div>
                      );
                    })}

                    {/* Legend */}
                    <div className="flex gap-3 mt-3 pt-2 border-t text-[10px] text-muted-foreground">
                      {[
                        ["bg-blue-500", "Place Details"],
                        ["bg-amber-500", "Outscraper"],
                        ["bg-violet-500", "Haiku Analysis"],
                        ["bg-emerald-500", "Merge"],
                      ].map(([color, label]) => (
                        <span key={label} className="flex items-center gap-1">
                          <span className={`inline-block w-2.5 h-2.5 rounded-sm ${color} opacity-80`} />
                          {label}
                        </span>
                      ))}
                    </div>

                    {/* Detail table (collapsed) */}
                    <details className="mt-2">
                      <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                        Raw timing data ({serverTimings.length} events)
                      </summary>
                      <table className="w-full text-[10px] mt-1">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b">
                            <th className="pb-1">ID</th>
                            <th className="pb-1">Label</th>
                            <th className="pb-1 text-right">Start</th>
                            <th className="pb-1 text-right">End</th>
                            <th className="pb-1 text-right">Duration</th>
                            <th className="pb-1">Detail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {serverTimings
                            .sort((a, b) => a.startMs - b.startMs)
                            .map((t) => (
                            <tr key={t.id} className="border-b border-dashed">
                              <td className="py-0.5 font-mono text-muted-foreground">{t.id}</td>
                              <td className="py-0.5">{t.label}</td>
                              <td className="py-0.5 text-right tabular-nums">{(t.startMs / 1000).toFixed(1)}s</td>
                              <td className="py-0.5 text-right tabular-nums">{(t.endMs / 1000).toFixed(1)}s</td>
                              <td className="py-0.5 text-right tabular-nums font-semibold">{((t.endMs - t.startMs) / 1000).toFixed(1)}s</td>
                              <td className="py-0.5 text-muted-foreground truncate max-w-[200px]">{t.detail}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </details>
                  </div>
                );
              })()}
            </Section>
          )}

          {/* --- Stage 1: Chain Discovery --- */}
          {(scanChainLocs !== null || scanChainErr) && (
            <Section
              title={`Chain Discovery — ${scanChainLocs?.length ?? 0} locations · ${scanChainDur != null ? `${(scanChainDur / 1000).toFixed(1)}s` : "…"}`}
              defaultOpen
            >
              {scanChainErr && <Err msg={scanChainErr} />}
              {scanChainLocs && scanChainLocs.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No additional chain locations found (single location business).
                </p>
              )}
              {scanChainLocs && scanChainLocs.length > 0 && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="pb-1">Name</th>
                      <th className="pb-1">Address</th>
                      <th className="pb-1">Reviews</th>
                      <th className="pb-1">Place ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanChainLocs.map((loc) => (
                      <tr key={loc.placeId} className="border-b border-dashed">
                        <td className="py-1 font-semibold">{loc.displayName}</td>
                        <td className="py-1 text-muted-foreground truncate max-w-[200px]">
                          {loc.formattedAddress}
                        </td>
                        <td className="py-1">{loc.userRatingCount ?? 0}</td>
                        <td className="py-1">
                          <code className="text-[10px] text-muted-foreground">{loc.placeId}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          )}

          {/* --- Stage 2: Review Collection --- */}
          {reviewProgress.length > 0 && (
            <Section
              title={`Review Collection — ${totalReviews} reviews from ${reviewProgress.length} location${reviewProgress.length === 1 ? "" : "s"}`}
              defaultOpen
            >
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-1">Location</th>
                    <th className="pb-1">Place ID</th>
                    <th className="pb-1 text-right">Reviews Fetched</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewProgress.map((rp) => (
                    <tr key={rp.placeId} className="border-b border-dashed">
                      <td className="py-1 font-semibold">{rp.displayName}</td>
                      <td className="py-1">
                        <code className="text-[10px] text-muted-foreground">{rp.placeId}</code>
                      </td>
                      <td className="py-1 text-right">{rp.reviewCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-2">
                Outscraper diverse fetch: 50 newest + 25 lowest + 25 highest, deduped.
              </p>
            </Section>
          )}

          {/* --- Stage 3: AI Analysis (batch-level detail) --- */}
          {batches.length > 0 && (
            <Section
              title={`AI Filtering — ${allMentions.length} staff mentions from ${batches.length} batches`}
              defaultOpen
            >
              <div className="grid grid-cols-4 gap-3 mb-3">
                <StatCard label="Total Mentions" value={allMentions.length} />
                <StatCard label="Positive" value={positiveMentions.length} />
                <StatCard label="Negative" value={negativeMentions.length} />
                <StatCard
                  label="Named Employees"
                  value={[...new Set(allMentions.flatMap((m) => m.staffNames))].length}
                />
              </div>

              <table className="w-full text-xs mb-3">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-1">Batch</th>
                    <th className="pb-1">Location</th>
                    <th className="pb-1 text-right">Mentions</th>
                    <th className="pb-1 text-right">Named</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b, i) => (
                    <tr key={i} className="border-b border-dashed">
                      <td className="py-1">#{b.batchIndex}</td>
                      <td className="py-1">{b.displayName}</td>
                      <td className="py-1 text-right">{b.mentions.length}</td>
                      <td className="py-1 text-right">
                        {b.namedEmployees.length > 0
                          ? b.namedEmployees.join(", ")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <label className="flex items-center gap-2 cursor-pointer text-xs mb-2">
                <input
                  type="checkbox"
                  checked={showRawMentions}
                  onChange={(e) => setShowRawMentions(e.target.checked)}
                />
                Show all mentions ({allMentions.length})
              </label>
              {showRawMentions && (
                <div className="max-h-[400px] overflow-y-auto">
                  {allMentions.map((m, i) => (
                    <div key={i} className="border-b border-dashed py-1.5">
                      <div className="flex gap-2 text-xs">
                        <span>{"★".repeat(m.reviewRating)}</span>
                        <Badge
                          variant={m.sentiment === "positive" ? "default" : "destructive"}
                          className="text-[10px]"
                        >
                          {m.sentiment}
                        </Badge>
                        <span className="font-semibold">{m.reviewAuthor}</span>
                        <span className="text-muted-foreground">{m.locationName}</span>
                        {(m.staffNames?.length ?? 0) > 0 && (
                          <span className="text-primary font-semibold">
                            [{(m.staffNames ?? []).join(", ")}]
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 italic">{m.relevantExcerpt}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* --- Stage 3b: Preliminary Output (shows while pipeline still running) --- */}
          {prelimAnalysis && !staffAnalysis && (
            <Section title="Preliminary Output — First Results" defaultOpen>
              <div className="space-y-3">
                <div className="border rounded p-4 bg-muted/30 border-dashed border-primary/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Preliminary — more reviews incoming</span>
                  </div>
                  <h3 className="text-base font-bold">&ldquo;{prelimAnalysis.headline}&rdquo;</h3>
                  <p className="text-xs text-muted-foreground mt-1">{prelimAnalysis.body}</p>
                  {prelimAnalysis.standoutEmployee && (
                    <p className="text-xs mt-2">
                      Standout employee: <span className="font-semibold text-primary">{prelimAnalysis.standoutEmployee}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <StatCard label="Reviews So Far" value={prelimAnalysis.totalReviewsAnalyzed} />
                  <StatCard label="Positive" value={prelimAnalysis.positiveCount} />
                  <StatCard label="Negative" value={prelimAnalysis.negativeCount} />
                  <StatCard label="Named Employees" value={prelimAnalysis.namedEmployees?.length ?? 0} />
                </div>
              </div>
            </Section>
          )}

          {/* --- Stage 4: Final Output --- */}
          {analysisError && (
            <Section title="Analysis Error" defaultOpen>
              <Err msg={analysisError} />
            </Section>
          )}

          {staffAnalysis && (
            <Section title="Final Output — Merged Analysis" defaultOpen>
              <div className="space-y-3">
                <div className="border rounded p-4 bg-muted/30">
                  <h3 className="text-base font-bold">&ldquo;{staffAnalysis.headline}&rdquo;</h3>
                  <p className="text-xs text-muted-foreground mt-1">{staffAnalysis.body}</p>
                  {staffAnalysis.standoutEmployee && (
                    <p className="text-xs mt-2">
                      Standout employee: <span className="font-semibold text-primary">{staffAnalysis.standoutEmployee}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-3">
                  <StatCard label="Reviews Analyzed" value={staffAnalysis.totalReviewsAnalyzed} />
                  <StatCard label="Positive" value={staffAnalysis.positiveCount} />
                  <StatCard label="Negative" value={staffAnalysis.negativeCount} />
                  <StatCard label="Named Employees" value={staffAnalysis.namedEmployees?.length ?? 0} />
                  <StatCard label="Locations" value={locationDetails.length} />
                </div>

                {(staffAnalysis.namedEmployees?.length ?? 0) > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold mb-1">Named Employees</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(staffAnalysis.namedEmployees ?? []).map((name) => {
                        const count = (staffAnalysis.mentions ?? []).filter((m) =>
                          (m.staffNames ?? []).includes(name)
                        ).length;
                        return (
                          <Badge key={name} variant="secondary" className="text-xs">
                            {name} ({count})
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* --- Locations scanned --- */}
          {locationDetails.length > 0 && (
            <Section
              title={`Locations Scanned — ${locationDetails.length}`}
              defaultOpen={locationDetails.length <= 5}
            >
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-1">Name</th>
                    <th className="pb-1">Address</th>
                    <th className="pb-1">Rating</th>
                    <th className="pb-1">Total Reviews</th>
                    <th className="pb-1">GP Reviews</th>
                    <th className="pb-1">Photos</th>
                  </tr>
                </thead>
                <tbody>
                  {locationDetails.map((loc) => (
                    <tr key={loc.placeId} className="border-b border-dashed">
                      <td className="py-1 font-semibold">{loc.displayName}</td>
                      <td className="py-1 text-muted-foreground truncate max-w-[200px]">
                        {loc.formattedAddress}
                      </td>
                      <td className="py-1">{loc.rating?.toFixed(1) ?? "—"}</td>
                      <td className="py-1">{loc.userRatingCount ?? 0}</td>
                      <td className="py-1">{loc.reviews.length}</td>
                      <td className="py-1">{loc.photos.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

// --- Helper components ---

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border rounded p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="border rounded p-3">
      <summary className="cursor-pointer font-semibold text-sm">
        {title}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function Row({
  label,
  status,
  duration,
  indent,
}: {
  label: string;
  status?: "ok" | "error";
  duration: number;
  indent?: boolean;
}) {
  return (
    <tr className="border-b border-dashed">
      <td className={`py-1 ${indent ? "pl-4 text-muted-foreground" : ""}`}>
        {label}
      </td>
      <td>{status && <StatusBadge status={status} />}</td>
      <td className="text-right">{(duration / 1000).toFixed(1)}s</td>
    </tr>
  );
}

function StatusBadge({ status }: { status: "ok" | "error" }) {
  return (
    <Badge
      variant={status === "ok" ? "default" : "destructive"}
      className="text-xs"
    >
      {status}
    </Badge>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const variant =
    confidence >= 0.7
      ? "default"
      : confidence >= 0.4
        ? "secondary"
        : "destructive";
  return (
    <Badge variant={variant} className="text-xs">
      {pct}%
    </Badge>
  );
}

function Err({ msg }: { msg?: string }) {
  return (
    <p className="text-xs text-destructive">{msg ?? "Unknown error"}</p>
  );
}

function SignalAnswer({
  signal,
}: {
  signal: {
    answer: string | number | boolean | string[] | null;
    answerType: string;
  };
}) {
  const { answer, answerType } = signal;

  if (answer === null || answer === undefined) {
    return <p className="text-xs text-muted-foreground italic">No data</p>;
  }

  if (answerType === "list" && Array.isArray(answer)) {
    return (
      <ul className="list-disc pl-4 text-xs space-y-0.5">
        {answer.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }

  if (answerType === "number") {
    return (
      <p className="text-lg font-bold">{Number(answer).toLocaleString()}</p>
    );
  }

  if (answerType === "boolean") {
    return (
      <Badge variant={answer ? "default" : "secondary"}>
        {answer ? "Yes" : "No"}
      </Badge>
    );
  }

  return <p className="text-xs whitespace-pre-line">{String(answer)}</p>;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
