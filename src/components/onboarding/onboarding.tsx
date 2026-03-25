'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AllgravyLogo } from '@/components/ui/allgravy-logo';
import {
  StepSearch,
  StepConfirmBusiness,
  StepConfirmLocations,
  StepGathering,
  StepDone,
} from './steps';
import type { FetchTiming, LocationItem, ReviewItem, Step } from './types';
import type { PlaceSummary, TextSearchResponse, PlaceDetailsResponse, ReviewInsight, ReviewAnalysis } from '@/lib/types';
import { OnboardingProvider, useOnboarding } from '@/lib/demo-flow-context';

const IGNORED_TYPES = new Set([
  'establishment',
  'point_of_interest',
  'food',
  'store',
]);

function buildChainQuery(place: PlaceSummary): string {
  const name = place.displayName;
  const typeHint = place.types?.find((t) => !IGNORED_TYPES.has(t));
  return typeHint ? `${name} ${typeHint.replace(/_/g, ' ')}` : name;
}

function extractDomain(websiteUri?: string): string | undefined {
  if (!websiteUri) return undefined;
  try {
    return new URL(websiteUri).hostname.replace('www.', '');
  } catch {
    return undefined;
  }
}

const floatRocket = {
  y: [0, -6, 0],
  rotate: [0, -2, 0],
  transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' as const },
};

const floatPineapple = {
  y: [0, -8, 0],
  rotate: [12, 16, 12],
  transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const },
};

export function Onboarding() {
  return (
    <OnboardingProvider>
      <OnboardingInner />
    </OnboardingProvider>
  );
}

function OnboardingInner() {
  const { state, dispatch } = useOnboarding();
  const { step, loading, selectedPlace, business, locations, gatheringData, fetchTimings } = state;

  const directionRef = useRef(1);
  const domainRef = useRef<string | undefined>(undefined);

  const goForward = (next: Step) => {
    directionRef.current = 1;
    dispatch({ type: 'SET_STEP', payload: next });
  };

  const goBack = (prev: Step) => {
    directionRef.current = -1;
    dispatch({ type: 'SET_STEP', payload: prev });
  };

  const startBackgroundFetch = useCallback((domain: string) => {
    dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'enrich', label: 'Waterfall Enrich' } });
    fetch('/api/company/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        dispatch({ type: 'UPDATE_GATHERING_DATA', payload: { company: data.company ?? null, persons: data.persons ?? [] } });
        dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'enrich', status: 'done' } });
      })
      .catch((err: unknown) => {
        dispatch({ type: 'UPDATE_GATHERING_DATA', payload: { company: null, persons: [] } });
        dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'enrich', status: 'error', errorMessage: err instanceof Error ? err.message : 'Unknown error' } });
      });
  }, [dispatch]);

  const startReviewsFetch = useCallback((placeIds: string[]) => {
    dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'reviews', label: 'Outscraper Reviews' } });
    fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeIds: placeIds.slice(0, 5), limit: 10 }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const outscraperReviews: ReviewItem[] = data.reviews ?? [];
        dispatch({ type: 'MERGE_REVIEWS', payload: outscraperReviews });
        dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'reviews', status: 'done' } });
      })
      .catch((err: unknown) => {
        dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'reviews', status: 'error', errorMessage: err instanceof Error ? err.message : 'Unknown error' } });
      });
  }, [dispatch]);

  const handleSearchSubmit = useCallback(async (place: PlaceSummary) => {
    dispatch({ type: 'SET_SELECTED_PLACE', payload: place });
    dispatch({ type: 'SET_LOADING', payload: true });

    const domain = extractDomain(place.websiteUri);

    dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'places', label: 'Google Places Search' } });
    dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'brand', label: 'Logo.dev Brand' } });

    try {
      const [chainResult, brandResult] = await Promise.all([
        fetch('/api/places/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: buildChainQuery(place),
            ...(domain && { websiteDomain: domain }),
          }),
        })
          .then((res) => res.json() as Promise<TextSearchResponse>)
          .then((data) => { dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'places', status: 'done' } }); return data; }),

        domain
          ? fetch('/api/brand', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domain }),
            })
              .then((res) => res.json())
              .then((data) => { dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'brand', status: 'done' } }); return data; })
          : Promise.resolve({ name: null, logoUrl: null, colors: ['#FFFFFF'] }),
      ]);

      const brandName = brandResult.name ?? place.displayName;

      const chainLocations: LocationItem[] = (chainResult.places ?? []).map((p: PlaceSummary) => {
        const firstSegment = (p.formattedAddress ?? '').split(',')[0].trim();
        const streetName = firstSegment.replace(/\s*\d[\d\w/-]*$/, '').trim();
        const locationLabel = streetName
          ? `${brandName} - ${streetName}`
          : p.displayName;

        return {
          id: p.placeId,
          name: locationLabel,
          address: p.formattedAddress,
          countryCode: p.countryCode,
          lat: p.location.lat,
          lng: p.location.lng,
        };
      });

      // Domain-based filtering is primary (handled by searchPlaces brandFilter).
      // Only apply country filtering as fallback when no domain was available.
      const filteredLocations = domain
        ? chainLocations
        : chainLocations.filter(loc => !place.countryCode || loc.countryCode === place.countryCode);

      // Sort by country — selected country first, then alphabetically by country code
      const selectedCountry = place.countryCode;
      filteredLocations.sort((a, b) => {
        if (a.countryCode === selectedCountry && b.countryCode !== selectedCountry) return -1;
        if (b.countryCode === selectedCountry && a.countryCode !== selectedCountry) return 1;
        return (a.countryCode ?? '').localeCompare(b.countryCode ?? '');
      });

      dispatch({ type: 'SET_LOCATIONS', payload: filteredLocations });
      domainRef.current = domain;

      dispatch({
        type: 'SET_BUSINESS',
        payload: {
          name: brandName,
          logoUrl: brandResult.logoUrl ?? null,
          domain: domain ?? '',
          brandColors: brandResult.colors ?? ['#FFFFFF'],
          fonts: brandResult.fonts ?? [],
          ogImage: brandResult.ogImage ?? null,
          websiteImages: brandResult.websiteImages ?? [],
        },
      });

      const detailPlaceIds = [
        place.placeId,
        ...filteredLocations.slice(0, 9).map((l) => l.id).filter((id) => id !== place.placeId),
      ].slice(0, 10);

      fetch('/api/places/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeIds: detailPlaceIds }),
      })
        .then((res) => res.json() as Promise<PlaceDetailsResponse>)
        .then((data) => {
          const allDetails = data.details ?? [];

          const allReviews = allDetails.flatMap((d) =>
            (d.reviews ?? []).map((r) => ({
              author: r.authorName,
              rating: r.rating,
              text: r.text,
              date: r.relativePublishTimeDescription,
            })),
          );
          if (allReviews.length > 0) {
            dispatch({ type: 'MERGE_REVIEWS', payload: allReviews });
          }

          const allPhotos = allDetails.flatMap((d) => d.photos ?? []);
          if (allPhotos.length > 0) {
            dispatch({ type: 'UPDATE_GATHERING_DATA', payload: { photos: allPhotos } });
          }
        })
        .catch(() => {});

      dispatch({ type: 'SET_LOADING', payload: false });
      goForward('confirm-business');
    } catch {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const handleBusinessConfirm = useCallback(
    (data: { name: string; website: string; colors: string[] }) => {
      if (business) {
        dispatch({
          type: 'UPDATE_BUSINESS',
          payload: { name: data.name, domain: data.website, brandColors: data.colors },
        });
      }

      const domain = domainRef.current ?? data.website;
      startBackgroundFetch(domain);

      goForward('confirm-locations');
    },
    [business, startBackgroundFetch, dispatch],
  );

  const startReviewAnalysisFetch = useCallback((confirmedLocs: LocationItem[]) => {
    const places: PlaceSummary[] = confirmedLocs.map((loc) => ({
      placeId: loc.id,
      displayName: loc.name,
      formattedAddress: loc.address,
      location: { lat: loc.lat, lng: loc.lng },
    }));

    dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'reviewAnalysis', label: 'Review Analysis (SSE)' } });

    fetch('/api/demo/scan/analyze?lite=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations: places }),
    })
      .then(async (res) => {
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        dispatch({ type: 'TRACK_SSE_EVENT', payload: { key: 'reviewAnalysis', event: `connected (${res.status})` } });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let insightCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let boundary: number;
          while ((boundary = buffer.indexOf('\n\n')) !== -1) {
            const message = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);

            let eventName = '';
            let eventData = '';

            for (const line of message.split('\n')) {
              if (line.startsWith('event: ')) {
                eventName = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                eventData = line.slice(6);
              }
            }

            if (!eventName && currentEvent) eventName = currentEvent;
            if (eventName) currentEvent = eventName;

            if (eventName && eventData) {
              try {
                const data = JSON.parse(eventData);
                if (eventName === 'batch_analysis') {
                  const insights = data.insights as ReviewInsight[];
                  insightCount += insights.length;
                  dispatch({ type: 'TRACK_SSE_EVENT', payload: { key: 'reviewAnalysis', event: `batch_analysis: +${insights.length} insights (total: ${insightCount})` } });
                  dispatch({ type: 'APPEND_REVIEW_INSIGHTS', payload: insights });
                } else if (eventName === 'analysis') {
                  dispatch({ type: 'TRACK_SSE_EVENT', payload: { key: 'reviewAnalysis', event: `analysis: final (${data.insights?.length ?? 0} insights)` } });
                  const analysis = data as ReviewAnalysis;
                  dispatch({ type: 'SET_REVIEW_ANALYSIS', payload: analysis });
                } else if (eventName === 'error') {
                  dispatch({ type: 'TRACK_SSE_EVENT', payload: { key: 'reviewAnalysis', event: `ERROR: ${data.message ?? JSON.stringify(data)}` } });
                } else if (eventName === 'timing') {
                  dispatch({ type: 'TRACK_SSE_EVENT', payload: { key: 'reviewAnalysis', event: `timing: ${data.label} (${data.detail ?? ''})` } });
                } else if (eventName === 'reviews_progress') {
                  dispatch({ type: 'TRACK_SSE_EVENT', payload: { key: 'reviewAnalysis', event: `reviews: ${data.displayName} +${data.reviewCount} (${data.sort})` } });
                } else if (eventName === 'done') {
                  dispatch({ type: 'TRACK_SSE_EVENT', payload: { key: 'reviewAnalysis', event: 'done' } });
                } else {
                  dispatch({ type: 'TRACK_SSE_EVENT', payload: { key: 'reviewAnalysis', event: `${eventName}` } });
                }
              } catch {
                dispatch({ type: 'TRACK_SSE_EVENT', payload: { key: 'reviewAnalysis', event: `parse-error: ${eventName}` } });
              }
            }
          }
        }

        dispatch({ type: 'TRACK_SSE_EVENT', payload: { key: 'reviewAnalysis', event: 'stream closed' } });

        // Set fallback analysis only if no analysis event was received
        dispatch({
          type: 'SET_REVIEW_ANALYSIS_FALLBACK',
          payload: {
            headline: '',
            body: '',
            insights: [],
            totalReviewsAnalyzed: 0,
            positiveCount: 0,
            negativeCount: 0,
            categoryBreakdown: [],
            strengths: [],
            opportunities: [],
          },
        });

        dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'reviewAnalysis', status: 'done' } });
      })
      .catch((err: unknown) => {
        dispatch({
          type: 'SET_REVIEW_ANALYSIS',
          payload: {
            headline: '',
            body: '',
            insights: [],
            totalReviewsAnalyzed: 0,
            positiveCount: 0,
            negativeCount: 0,
            categoryBreakdown: [],
            strengths: [],
            opportunities: [],
          },
        });
        dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'reviewAnalysis', status: 'error', errorMessage: err instanceof Error ? err.message : 'Unknown error' } });
      });
  }, [dispatch]);

  const handleLocationsEarlyStart = useCallback((confirmedLocs: LocationItem[]) => {
    startReviewsFetch(confirmedLocs.map((l) => l.id));
    startReviewAnalysisFetch(confirmedLocs);
  }, [startReviewsFetch, startReviewAnalysisFetch]);

  const handleLocationsConfirm = useCallback((confirmedLocs: LocationItem[]) => {
    dispatch({ type: 'SET_LOCATIONS', payload: confirmedLocs });
    goForward('gathering');
  }, [dispatch]);

  const handleGatheringComplete = useCallback(() => {
    // No-op: stay on gathering page (branded-app phase)
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'confirm-locations') {
      goBack('confirm-business');
    } else if (step === 'confirm-business') {
      goBack('search');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [step, dispatch]);

  const showBack = step === 'confirm-business' || step === 'confirm-locations';
  const showLogo = step === 'search';
  const showIllustrations = step !== 'gathering' && step !== 'done';
  const isFullBleed = step === 'gathering' || step === 'done';

  return (
    <div className={`relative flex flex-col items-center min-h-dvh bg-gray-50/40 font-sans ${isFullBleed ? 'overflow-hidden' : 'overflow-y-auto justify-center py-12'}`}>
      <AnimatePresence>
        {showBack && (
          <motion.div
            className="fixed top-5 left-5 z-50"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ChevronLeft className="size-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogo && (
          <motion.div
            key="allgravy-logo"
            className="fixed top-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <AllgravyLogo className="w-28" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" custom={directionRef.current}>
        {step === 'search' && (
          <StepSearch
            key="step-search"
            direction={directionRef.current}
            initialPlace={selectedPlace}
            onSubmit={handleSearchSubmit}
            loading={loading}
          />
        )}

        {step === 'confirm-business' && business && (
          <StepConfirmBusiness
            key="step-confirm-business"
            direction={directionRef.current}
            business={business}
            onConfirm={handleBusinessConfirm}
          />
        )}

        {step === 'confirm-locations' && (
          <StepConfirmLocations
            key="step-confirm-locations"
            direction={directionRef.current}
            locations={locations}
            onEarlyStart={handleLocationsEarlyStart}
            onConfirm={handleLocationsConfirm}
          />
        )}

        {step === 'gathering' && business && (
          <StepGathering
            key="step-gathering"
            onComplete={handleGatheringComplete}
          />
        )}

        {step === 'done' && <StepDone key="step-done" />}
      </AnimatePresence>

      <AnimatePresence>
        {showIllustrations && (
          <>
            <motion.img
              key="rocket"
              src="/ag-rocket.svg"
              alt=""
              className="fixed bottom-6 left-6 pointer-events-none select-none"
              animate={floatRocket}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
            <motion.img
              key="pineapple"
              src="/ag-pineapple.svg"
              alt=""
              className="fixed top-12 right-12 pointer-events-none select-none"
              animate={floatPineapple}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </>
        )}
      </AnimatePresence>

      <FetchTimingsDebug timings={fetchTimings} />
    </div>
  );
}

function LiveElapsed({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  return <>{((now - startedAt) / 1000).toFixed(1)}s</>;
}

function FetchTimingsDebug({ timings }: { timings: Record<string, FetchTiming> }) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const entries = Object.entries(timings);
  if (entries.length === 0) return null;

  const toggle = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="fixed bottom-4 left-4 z-[9999] bg-black/80 text-white rounded-xl px-4 py-3 text-xs font-mono backdrop-blur-sm min-w-[280px] max-w-[420px]">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setCollapsed((p) => !p)}
      >
        <span className="text-[10px] uppercase tracking-wider text-gray-400">API Timings</span>
        <span className="text-gray-500 text-[10px]">{collapsed ? '▸' : '▾'}</span>
      </div>
      {!collapsed && (
        <div className="space-y-1.5 mt-1.5 max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:hidden">
          {entries.map(([key, t]) => (
            <div key={key}>
              <div
                className="flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5 -mx-1 px-1 rounded"
                onClick={() => t.sseEvents?.length ? toggle(key) : undefined}
              >
                <span className="text-gray-300">
                  {t.label}
                  {t.sseEvents?.length ? (
                    <span className="text-gray-500 ml-1">({t.sseEvents.length} events)</span>
                  ) : null}
                </span>
                <span className={t.status === 'done' ? 'text-green-400' : t.status === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                  {t.status === 'pending' ? (
                    <LiveElapsed startedAt={t.startedAt} />
                  ) : (
                    `${(t.durationMs! / 1000).toFixed(1)}s`
                  )}
                </span>
              </div>
              {t.status === 'error' && t.errorMessage && (
                <div className="text-red-400/80 text-[10px] mt-0.5 break-words leading-tight">
                  {t.errorMessage}
                </div>
              )}
              {expandedKeys.has(key) && t.sseEvents && (
                <div className="ml-2 mt-1 mb-1 space-y-0.5 border-l border-gray-600 pl-2">
                  {t.sseEvents.map((evt, i) => (
                    <div key={i} className="text-[10px] text-gray-400 break-words leading-tight">
                      {evt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
