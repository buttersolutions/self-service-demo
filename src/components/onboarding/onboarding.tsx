'use client';

import { useState, useCallback, useRef } from 'react';
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
import type { BusinessData } from './steps';
import type { LocationItem, GatheringData, ReviewItem } from './types';
import type { PlaceSummary, TextSearchResponse, PlaceDetailsResponse } from '@/lib/types';

type Step = 'search' | 'confirm-business' | 'confirm-locations' | 'gathering' | 'done';

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

interface FetchTiming {
  label: string;
  startedAt: number;
  finishedAt: number | null;
  durationMs: number | null;
  status: 'pending' | 'done' | 'error';
  errorMessage?: string;
}

export function Onboarding() {
  const [step, setStep] = useState<Step>('search');
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(null);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [gatheringData, setGatheringData] = useState<GatheringData>({
    reviews: null,
    insights: null,
    company: null,
    persons: null,
    photos: [],
  });
  const [fetchTimings, setFetchTimings] = useState<Record<string, FetchTiming>>({});
  const directionRef = useRef(1);
  const domainRef = useRef<string | undefined>(undefined);

  const trackFetchStart = useCallback((key: string, label: string) => {
    setFetchTimings((prev) => ({
      ...prev,
      [key]: { label, startedAt: Date.now(), finishedAt: null, durationMs: null, status: 'pending' },
    }));
  }, []);

  const trackFetchEnd = useCallback((key: string, status: 'done' | 'error', errorMessage?: string) => {
    setFetchTimings((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      const finishedAt = Date.now();
      return {
        ...prev,
        [key]: { ...existing, finishedAt, durationMs: finishedAt - existing.startedAt, status, errorMessage },
      };
    });
  }, []);

  const goForward = (next: Step) => {
    directionRef.current = 1;
    setStep(next);
  };

  const goBack = (prev: Step) => {
    directionRef.current = -1;
    setStep(prev);
  };

  const startBackgroundFetch = useCallback((domain: string, placeIds: string[]) => {
    trackFetchStart('insights', 'Saber Insights');
    fetch('/api/company/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
        setGatheringData((prev) => ({ ...prev, insights: data.insights ?? [] }));
        trackFetchEnd('insights', 'done');
      })
      .catch((err: unknown) => {
        setGatheringData((prev) => ({ ...prev, insights: [] }));
        trackFetchEnd('insights', 'error', err instanceof Error ? err.message : 'Unknown error');
      });

    // Fetch Outscraper reviews — merge with any existing Google reviews
    trackFetchStart('reviews', 'Outscraper Reviews');
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
        setGatheringData((prev) => {
          const existing = prev.reviews ?? [];
          // Merge: keep existing Google reviews, add new Outscraper ones (dedup by author+text)
          const seen = new Set(existing.map((r) => `${r.author}:${(r.text ?? '').slice(0, 50)}`));
          const merged = [...existing];
          for (const review of outscraperReviews) {
            const key = `${review.author}:${(review.text ?? '').slice(0, 50)}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(review);
            }
          }
          return { ...prev, reviews: merged };
        });
        trackFetchEnd('reviews', 'done');
      })
      .catch((err: unknown) => {
        setGatheringData((prev) => ({ ...prev, reviews: prev.reviews ?? [] }));
        trackFetchEnd('reviews', 'error', err instanceof Error ? err.message : 'Unknown error');
      });

    trackFetchStart('enrich', 'Waterfall Enrich');
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
        setGatheringData((prev) => ({
          ...prev,
          company: data.company ?? null,
          persons: data.persons ?? [],
        }));
        trackFetchEnd('enrich', 'done');
      })
      .catch((err: unknown) => {
        setGatheringData((prev) => ({ ...prev, company: null, persons: [] }));
        trackFetchEnd('enrich', 'error', err instanceof Error ? err.message : 'Unknown error');
      });
  }, [trackFetchStart, trackFetchEnd]);

  const handleSearchSubmit = useCallback(async (place: PlaceSummary) => {
    setSelectedPlace(place);
    setLoading(true);

    const domain = extractDomain(place.websiteUri);

    trackFetchStart('places', 'Google Places Search');
    trackFetchStart('brand', 'Logo.dev Brand');

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
          .then((data) => { trackFetchEnd('places', 'done'); return data; }),

        domain
          ? fetch('/api/brand', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domain }),
            })
              .then((res) => res.json())
              .then((data) => { trackFetchEnd('brand', 'done'); return data; })
          : Promise.resolve({ name: null, logoUrl: null, colors: ['#FFFFFF'] }),
      ]);

      const chainLocations: LocationItem[] = (chainResult.places ?? []).map((p: PlaceSummary) => ({
        id: p.placeId,
        name: p.displayName,
        address: p.formattedAddress,
        countryCode: p.countryCode,
        lat: p.location.lat,
        lng: p.location.lng,
      }));

      setLocations(chainLocations);
      domainRef.current = domain;

      setBusiness({
        name: brandResult.name ?? place.displayName,
        logoUrl: brandResult.logoUrl ?? null,
        domain: domain ?? '',
        brandColors: brandResult.colors ?? ['#FFFFFF'],
      });

      // Fetch Google Place Details for multiple locations to get seed reviews + lots of photos
      const detailPlaceIds = [
        place.placeId,
        ...chainLocations.slice(0, 9).map((l) => l.id).filter((id) => id !== place.placeId),
      ].slice(0, 10);

      fetch('/api/places/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeIds: detailPlaceIds }),
      })
        .then((res) => res.json() as Promise<PlaceDetailsResponse>)
        .then((data) => {
          const allDetails = data.details ?? [];

          setGatheringData((prev) => {
            const updates: Partial<typeof prev> = {};

            // Seed reviews from the first location with reviews
            if (!prev.reviews || prev.reviews.length === 0) {
              const allReviews = allDetails.flatMap((d) =>
                (d.reviews ?? []).map((r) => ({
                  author: r.authorName,
                  rating: r.rating,
                  text: r.text,
                  date: r.relativePublishTimeDescription,
                })),
              );
              if (allReviews.length > 0) {
                updates.reviews = allReviews;
              }
            }

            // Collect photos from ALL locations
            const allPhotos = allDetails.flatMap((d) => d.photos ?? []);
            if (allPhotos.length > 0) {
              updates.photos = allPhotos;
            }

            return { ...prev, ...updates };
          });
        })
        .catch(() => {});

      setLoading(false);
      goForward('confirm-business');
    } catch {
      setLoading(false);
    }
  }, []);

  const handleBusinessConfirm = useCallback(
    (data: { name: string; website: string; colors: string[] }) => {
      if (business) {
        setBusiness({ ...business, name: data.name, domain: data.website, brandColors: data.colors });
      }

      const domain = domainRef.current ?? data.website;
      const placeIds = locations.map((l) => l.id);
      startBackgroundFetch(domain, placeIds);

      goForward('confirm-locations');
    },
    [business, locations, startBackgroundFetch],
  );

  const handleLocationsConfirm = useCallback((confirmedLocs: LocationItem[]) => {
    setLocations(confirmedLocs);
    goForward('gathering');
  }, []);

  const handleGatheringComplete = useCallback(() => {
    // No-op: stay on gathering page (branded-app phase)
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'confirm-locations') {
      goBack('confirm-business');
    } else if (step === 'confirm-business') {
      goBack('search');
      setLoading(false);
    }
  }, [step]);

  const showBack = step === 'confirm-business' || step === 'confirm-locations';
  const showLogo = step === 'search';
  const showIllustrations = step !== 'gathering' && step !== 'done';
  const isFullBleed = step === 'gathering' || step === 'done';

  return (
    <div className={`relative flex flex-col items-center min-h-dvh bg-gray-50/40 font-sans overflow-hidden ${isFullBleed ? '' : 'justify-center py-12'}`}>
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
            onConfirm={handleLocationsConfirm}
          />
        )}

        {step === 'gathering' && business && (
          <StepGathering
            key="step-gathering"
            business={business}
            locations={locations}
            gatheringData={gatheringData}
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

function FetchTimingsDebug({ timings }: { timings: Record<string, FetchTiming> }) {
  const entries = Object.entries(timings);
  if (entries.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-black/80 text-white rounded-xl px-4 py-3 text-xs font-mono space-y-1.5 backdrop-blur-sm min-w-[260px] max-w-[380px]">
      <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">API Timings</div>
      {entries.map(([key, t]) => (
        <div key={key}>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-300">{t.label}</span>
            <span className={t.status === 'done' ? 'text-green-400' : t.status === 'error' ? 'text-red-400' : 'text-yellow-400'}>
              {t.durationMs !== null ? `${(t.durationMs / 1000).toFixed(1)}s` : '...'}
            </span>
          </div>
          {t.status === 'error' && t.errorMessage && (
            <div className="text-red-400/80 text-[10px] mt-0.5 break-words leading-tight">
              {t.errorMessage}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
