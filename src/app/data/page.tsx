"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CollectResponse } from "@/app/api/data/collect/route";
import type { RunSummary } from "@/app/api/data/runs/route";

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
  const [view, setView] = useState<"new" | "history">("new");

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
            <Row
              label={`Saber (${result.pipelines.saber.completedCount}/${result.pipelines.saber.signalCount} signals)`}
              status={result.pipelines.saber.status}
              duration={result.pipelines.saber.durationMs}
            />
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

      {/* --- Saber Signals --- */}
      <Section
        title={`Saber Signals (${result.pipelines.saber.completedCount}/${result.pipelines.saber.signalCount})`}
        defaultOpen
      >
        {result.pipelines.saber.status === "error" ? (
          <Err msg={result.pipelines.saber.error} />
        ) : (
          <div className="space-y-4">
            {(result.pipelines.saber.data ?? []).map((signal) => (
              <div
                key={signal.label}
                className="border-b border-dashed pb-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{signal.label}</span>
                  {signal.confidence != null && (
                    <ConfidenceBadge confidence={signal.confidence} />
                  )}
                  {signal.durationMs != null && (
                    <span className="text-xs text-muted-foreground">
                      {(signal.durationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  {signal.error && (
                    <Badge variant="destructive" className="text-xs">
                      error
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  Q: {signal.question}
                </p>
                {signal.error ? (
                  <p className="text-xs text-destructive">{signal.error}</p>
                ) : (
                  <SignalAnswer signal={signal} />
                )}
                {signal.reasoning && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    {signal.reasoning}
                  </p>
                )}
                {signal.sources && signal.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {signal.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline text-muted-foreground hover:text-foreground"
                      >
                        {src.title || src.url}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

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
