"use client";

import { useState, useRef, useCallback } from "react";
import { Check, Loader2, MapPin, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LocationAutocomplete } from "@/components/demo/location-autocomplete";
import { ScanningAnimation } from "@/components/demo/scanning-animation";
import { StaffNarrativeHero } from "@/components/demo/staff-narrative-hero";
import { StaffReviewCard } from "@/components/demo/staff-review-card";
import { ReportLocationCard } from "@/components/demo/report-location-card";
import { ReportCTA } from "@/components/demo/report-cta";
import { cn } from "@/lib/utils";
import type {
  PlaceSummary,
  StaffMention,
  ScanResult,
  PlaceDetails,
  StaffAnalysis,
} from "@/lib/types";

// --- Types ---

interface ReviewProgress {
  placeId: string;
  displayName: string;
  reviewCount: number;
}

interface BatchAnalysis {
  placeId: string;
  displayName: string;
  batchIndex: number;
  mentions: StaffMention[];
  namedEmployees: string[];
}

interface LocationAnalysis {
  placeId: string;
  displayName: string;
  mentions: StaffMention[];
  namedEmployees: string[];
  positiveCount: number;
  negativeCount: number;
}

// --- SSE reader ---

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

// --- Component ---

type Phase = "search" | "scanning" | "report";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("search");
  const [place, setPlace] = useState<PlaceSummary | null>(null);

  // Scanning state
  const [reviewProgress, setReviewProgress] = useState<ReviewProgress[]>([]);
  const [allMentions, setAllMentions] = useState<StaffMention[]>([]);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // Chain state
  const [chainLocations, setChainLocations] = useState<PlaceSummary[] | null>(
    null
  );
  const [chainSelected, setChainSelected] = useState<Set<string>>(new Set());
  const [chainAnalyzing, setChainAnalyzing] = useState(false);
  const chainDoneRef = useRef(false);
  const primaryDoneRef = useRef(false);

  // Status text for scanning animation
  const [scanStatus, setScanStatus] = useState("Collecting reviews...");

  // Transition to report when both primary + chain are done
  const maybeTransition = useCallback(() => {
    if (primaryDoneRef.current && chainDoneRef.current) {
      setPhase("report");
    }
  }, []);

  // --- Place selected: kick off scanning ---
  function handlePlaceSelected(selectedPlace: PlaceSummary) {
    setPlace(selectedPlace);
    setPhase("scanning");

    // Reset state
    setReviewProgress([]);
    setAllMentions([]);
    setScanResult(null);
    setChainLocations(null);
    setChainSelected(new Set());
    setChainAnalyzing(false);
    chainDoneRef.current = false;
    primaryDoneRef.current = false;

    // Stream 1: Chain discovery (background)
    fetch("/api/demo/scan/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: selectedPlace.displayName,
        websiteUri: selectedPlace.websiteUri,
      }),
    }).then((res) =>
      readSSE(res, {
        locations: (data) => {
          const locs = data as PlaceSummary[];
          const others = locs.filter(
            (l) => l.placeId !== selectedPlace.placeId
          );
          setChainLocations(others);
          setChainSelected(new Set(others.map((l) => l.placeId)));
          if (others.length === 0) {
            chainDoneRef.current = true;
            maybeTransition();
          }
        },
      })
    );

    // Stream 2: Primary analysis
    fetch("/api/demo/scan/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations: [selectedPlace] }),
    }).then((res) =>
      readSSE(res, {
        reviews_progress: (data) => {
          const rp = data as ReviewProgress;
          setReviewProgress((prev) => [...prev, rp]);
          setScanStatus(`Found ${rp.reviewCount} reviews from ${rp.displayName}`);
        },
        batch_analysis: (data) => {
          const ba = data as BatchAnalysis;
          setAllMentions((prev) => [...prev, ...ba.mentions]);
          if (ba.mentions.length > 0) {
            setScanStatus("Analyzing staff mentions...");
          }
        },
        done: (data) => {
          const result = data as ScanResult;
          setScanResult(result);
          primaryDoneRef.current = true;
          // If no chain locations found yet or chain already resolved to 0
          if (chainDoneRef.current) {
            setPhase("report");
          }
        },
      })
    );
  }

  // --- Chain confirm ---
  const handleChainConfirm = useCallback(() => {
    if (!chainLocations || !place) return;
    const confirmed = chainLocations.filter((l) =>
      chainSelected.has(l.placeId)
    );
    if (!confirmed.length) {
      chainDoneRef.current = true;
      maybeTransition();
      return;
    }

    setChainAnalyzing(true);

    fetch("/api/demo/scan/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations: confirmed }),
    }).then((res) =>
      readSSE(res, {
        reviews_progress: (data) =>
          setReviewProgress((prev) => [...prev, data as ReviewProgress]),
        batch_analysis: (data) => {
          const ba = data as BatchAnalysis;
          setAllMentions((prev) => [...prev, ...ba.mentions]);
        },
        done: (data) => {
          const result = data as ScanResult;
          setScanResult((prev) => {
            if (!prev) return result;
            return {
              place: prev.place,
              locations: [...prev.locations, ...result.locations],
              locationDetails: [
                ...prev.locationDetails,
                ...result.locationDetails,
              ],
              staffAnalysis: result.staffAnalysis
                ? {
                    ...result.staffAnalysis,
                    mentions: [
                      ...(prev.staffAnalysis?.mentions ?? []),
                      ...result.staffAnalysis.mentions,
                    ],
                    namedEmployees: [
                      ...new Set([
                        ...(prev.staffAnalysis?.namedEmployees ?? []),
                        ...result.staffAnalysis.namedEmployees,
                      ]),
                    ],
                    totalReviewsAnalyzed:
                      (prev.staffAnalysis?.totalReviewsAnalyzed ?? 0) +
                      result.staffAnalysis.totalReviewsAnalyzed,
                    positiveCount:
                      (prev.staffAnalysis?.positiveCount ?? 0) +
                      result.staffAnalysis.positiveCount,
                    negativeCount:
                      (prev.staffAnalysis?.negativeCount ?? 0) +
                      result.staffAnalysis.negativeCount,
                  }
                : prev.staffAnalysis,
            };
          });
          setChainAnalyzing(false);
          chainDoneRef.current = true;
          maybeTransition();
        },
      })
    );
  }, [chainLocations, chainSelected, place, maybeTransition]);

  const handleChainSkip = useCallback(() => {
    setChainLocations([]);
    chainDoneRef.current = true;
    maybeTransition();
  }, [maybeTransition]);

  function toggleChain(placeId: string) {
    setChainSelected((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  // --- Derived ---
  const hasChain = chainLocations !== null && chainLocations.length > 0;
  const primaryDone = scanResult !== null;

  // --- Render ---
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header
        className={cn(
          "px-6 py-4 transition-all duration-500",
          phase !== "search" && "border-b border-border bg-card"
        )}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-xl font-bold tracking-tight">All Gravy</span>
          {phase !== "search" && place && (
            <span className="text-sm text-muted-foreground">
              {phase === "scanning" ? "Scanning" : "Staff Report"} ·{" "}
              {place.displayName}
            </span>
          )}
        </div>
      </header>

      {/* ========== PHASE 1: SEARCH ========== */}
      {phase === "search" && (
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-24 animate-in fade-in duration-500">
          <div className="w-full max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Your staff are your brand.{" "}
              <span className="text-primary">
                See what customers really think.
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
              Get a free AI-powered staff report for your business in 60
              seconds.
            </p>

            <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <LocationAutocomplete
                  onPlaceSelected={handlePlaceSelected}
                  placeholder="Search for your business..."
                  className="h-12 rounded-xl border-2 border-border bg-card text-base shadow-sm focus:border-primary"
                />
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Works with restaurants, hotels, retail, salons — any business with
              customer reviews.
            </p>
          </div>
        </main>
      )}

      {/* ========== PHASE 2: SCANNING ========== */}
      {phase === "scanning" && (
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-16 animate-in fade-in duration-500">
          {/* Scanning animation */}
          <ScanningAnimation status={scanStatus} />

          {/* Review progress badges */}
          {reviewProgress.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {reviewProgress.map((rp) => (
                <span
                  key={rp.placeId}
                  className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 animate-in fade-in duration-300"
                >
                  <Check className="h-3 w-3" />
                  {rp.displayName} · {rp.reviewCount} reviews
                </span>
              ))}
            </div>
          )}

          {/* Streaming mention cards */}
          {allMentions.length > 0 && (
            <div className="mt-8 space-y-3">
              {allMentions.map((m, i) => (
                <div
                  key={i}
                  className="mx-auto max-w-lg animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <StaffReviewCard mention={m} />
                </div>
              ))}
            </div>
          )}

          {/* Loading while waiting for first results */}
          {allMentions.length === 0 && !primaryDone && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Fetching and analyzing reviews...
              </p>
            </div>
          )}

          {/* Chain locations — inline prompt */}
          {hasChain && !chainAnalyzing && !chainDoneRef.current && (
            <div className="mx-auto mt-10 max-w-lg rounded-xl border border-border bg-card p-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
              <h3 className="text-lg font-bold">
                We found {chainLocations.length} more location
                {chainLocations.length === 1 ? "" : "s"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Want to include them in your report?
              </p>
              <div className="mt-4 space-y-2">
                {chainLocations.map((loc) => (
                  <label
                    key={loc.placeId}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      chainSelected.has(loc.placeId)
                        ? "border-primary/40 bg-primary/5"
                        : "border-border"
                    )}
                  >
                    <Checkbox
                      checked={chainSelected.has(loc.placeId)}
                      onCheckedChange={() => toggleChain(loc.placeId)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {loc.displayName}
                        </p>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {loc.formattedAddress}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <Button
                  onClick={handleChainConfirm}
                  disabled={chainSelected.size === 0}
                  className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                  size="sm"
                >
                  Include {chainSelected.size} location
                  {chainSelected.size === 1 ? "" : "s"} →
                </Button>
                <Button variant="ghost" size="sm" onClick={handleChainSkip}>
                  Skip
                </Button>
              </div>
            </div>
          )}

          {/* Chain analyzing */}
          {chainAnalyzing && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Scanning additional locations...
              </p>
            </div>
          )}
        </main>
      )}

      {/* ========== PHASE 3: REPORT ========== */}
      {phase === "report" && scanResult && (
        <Report result={scanResult} />
      )}
    </div>
  );
}

// --- Report section (inline) ---

function Report({ result }: { result: ScanResult }) {
  const { staffAnalysis, locationDetails, locations } = result;
  const positiveMentions =
    staffAnalysis?.mentions.filter((m) => m.sentiment === "positive") ?? [];
  const negativeMentions =
    staffAnalysis?.mentions.filter((m) => m.sentiment === "negative") ?? [];
  const champions =
    staffAnalysis?.namedEmployees.filter((name) =>
      positiveMentions.some((m) => m.staffNames.includes(name))
    ) ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 animate-in fade-in duration-700">
      {/* Section 1: Narrative Hero */}
      {staffAnalysis && (
        <StaffNarrativeHero
          analysis={staffAnalysis}
          locationCount={locations.length}
          className="py-12 md:py-20 animate-in fade-in slide-in-from-bottom-4 duration-700"
        />
      )}

      {!staffAnalysis && (
        <section className="py-12">
          <h1 className="text-3xl font-bold">Staff Report</h1>
          <p className="mt-2 text-muted-foreground">
            We scanned {locations.length} location
            {locations.length === 1 ? "" : "s"} but couldn&apos;t find enough
            staff-related reviews to generate insights.
          </p>
        </section>
      )}

      {/* Section 2: Staff Highlights */}
      {staffAnalysis && staffAnalysis.mentions.length > 0 && (
        <section className="pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <h2 className="text-xl font-bold">
            What customers say about your team
          </h2>

          {positiveMentions.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-green-700">
                Positive mentions ({positiveMentions.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {positiveMentions.map((m, i) => (
                  <StaffReviewCard key={i} mention={m} />
                ))}
              </div>
            </div>
          )}

          {negativeMentions.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-amber-700">
                Areas for improvement ({negativeMentions.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {negativeMentions.map((m, i) => (
                  <StaffReviewCard key={i} mention={m} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Section 3: Team Champions */}
      {champions.length > 0 && staffAnalysis && (
        <section className="border-t border-border py-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <h2 className="text-xl font-bold">Your team champions</h2>
          <p className="mt-1 text-muted-foreground">
            Customers called out these employees by name.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {champions.map((name) => {
              const mentions = positiveMentions.filter((m) =>
                m.staffNames.includes(name)
              );
              return (
                <div
                  key={name}
                  className="rounded-xl border border-primary/20 bg-primary/5 p-4"
                >
                  <p className="text-lg font-bold text-primary">{name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mentions.length} positive mention
                    {mentions.length === 1 ? "" : "s"}
                  </p>
                  {mentions[0] && (
                    <p className="mt-2 text-sm italic text-foreground/70">
                      &ldquo;{mentions[0].relevantExcerpt}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 4: Locations */}
      {locationDetails.length > 0 && (
        <section className="border-t border-border py-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <h2 className="text-xl font-bold">Locations scanned</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {locationDetails.map((loc) => (
              <ReportLocationCard key={loc.placeId} location={loc} />
            ))}
          </div>
        </section>
      )}

      {/* Section 5: CTA */}
      <div className="animate-in fade-in duration-700 delay-700">
        <ReportCTA />
      </div>

      <div className="py-8 text-center text-xs text-muted-foreground">
        Powered by All Gravy · Staff insights generated from public reviews
      </div>
    </div>
  );
}
