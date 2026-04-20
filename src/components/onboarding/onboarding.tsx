'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AllgravyLogo } from '@/components/ui/allgravy-logo';
import { OnboardingShell } from './ui/onboarding-shell';
import {
  StepSearch,
  StepMapScanning,
  StepPhotosScanning,
  StepWebsiteScanning,
  StepWebsitePrompt,
  StepConfirm,
  StepMockup,
  StepDone,
} from './steps';
import type { FetchTiming, LocationItem, Step } from './types';
import type { PlaceSummary, TextSearchResponse, PlaceDetailsResponse } from '@/lib/types';
import { OnboardingProvider, useOnboarding } from '@/lib/demo-flow-context';
import { extractDomain, classifyWebsiteUri } from '@/lib/domain-utils';
import { track } from '@/lib/tracking/track';

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
      <Suspense>
        <OnboardingInner />
      </Suspense>
    </OnboardingProvider>
  );
}

function OnboardingInner() {
  const { state, dispatch } = useOnboarding();
  const { step, loading, selectedPlace, business, locations, gatheringData, fetchTimings } = state;

  const searchParams = useSearchParams();
  const directionRef = useRef(1);
  const domainRef = useRef<string | undefined>(undefined);
  const autoSubmittedRef = useRef(false);
  const brandPromiseRef = useRef<Promise<void> | null>(null);
  const chainPromiseRef = useRef<Promise<void> | null>(null);
  const screenshotPromiseRef = useRef<Promise<void> | null>(null);
  const photosCountRef = useRef(0);
  useEffect(() => {
    photosCountRef.current = gatheringData.photos.length;
  }, [gatheringData.photos.length]);

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

  const handleSearchSubmit = useCallback(async (place: PlaceSummary) => {
    dispatch({ type: 'SET_SELECTED_PLACE', payload: place });
    dispatch({ type: 'SET_LOADING', payload: true });

    track({
      name: 'search_submitted',
      props: { place_id: place.placeId, has_website: !!place.websiteUri },
    });

    const uriResult = classifyWebsiteUri(place.websiteUri);
    const domain = uriResult.type === 'domain' ? uriResult.domain : undefined;

    const primaryLoc: LocationItem = {
      id: place.placeId,
      name: place.displayName,
      address: place.formattedAddress,
      countryCode: place.countryCode,
      lat: place.location.lat,
      lng: place.location.lng,
      userRatingCount: place.userRatingCount,
      rating: place.rating,
    };

    dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'places', label: 'Google Places Search' } });
    if (uriResult.type !== 'social') {
      dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'brand', label: 'Brand Extract' } });
    }

    // Set initial business immediately (brand fetch will overwrite with logo/colors)
    dispatch({
      type: 'SET_BUSINESS',
      payload: {
        name: place.displayName,
        logoUrl: null,
        domain: domain ?? '',
        brandColors: ['#FFFFFF'],
      },
    });

    // Set initial locations to just the primary location (chain discovery will add more)
    dispatch({ type: 'SET_LOCATIONS', payload: [primaryLoc] });
    domainRef.current = domain;

    // Fire screenshot fetch immediately — it's fast (~0.5s) and needs to be ready
    // by the time the website-scanning step renders
    if (domain) {
      dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'screenshot', label: 'Website Screenshot' } });
      screenshotPromiseRef.current = fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
        .then((res) => res.json())
        .then((data) => {
          dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'screenshot', status: 'done' } });
          if (data.screenshot) {
            dispatch({ type: 'UPDATE_BUSINESS', payload: { screenshot: data.screenshot } });
          }
        })
        .catch(() => {
          dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'screenshot', status: 'error' } });
        });
    }

    // Fire brand fetch in background
    if (uriResult.type === 'social') {
      // Instagram/social: use Apify Instagram scraper
      dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'instagram', label: 'Instagram Profile' } });
      brandPromiseRef.current = fetch('/api/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagramUrl: uriResult.originalUrl }),
      })
        .then((res) => res.json())
        .then((data) => {
          dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'instagram', status: 'done' } });
          dispatch({
            type: 'UPDATE_BUSINESS',
            payload: {
              name: place.displayName,
              logoUrl: data.logo ?? null,
              brandColors: data.colors ?? ['#FFFFFF'],
              instagramUsername: data.username ?? null,
            },
          });

          // If Instagram profile has an external website, fire full brand + screenshot fetch
          if (data.discoveredDomain) {
            domainRef.current = data.discoveredDomain;
            dispatch({ type: 'UPDATE_BUSINESS', payload: { domain: data.discoveredDomain } });

            dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'screenshot', label: 'Website Screenshot' } });
            screenshotPromiseRef.current = fetch('/api/screenshot', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domain: data.discoveredDomain }),
            })
              .then((r) => r.json())
              .then((d) => {
                dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'screenshot', status: 'done' } });
                if (d.screenshot) {
                  dispatch({ type: 'UPDATE_BUSINESS', payload: { screenshot: d.screenshot } });
                }
              })
              .catch(() => {
                dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'screenshot', status: 'error' } });
              });

            // Also fire Firecrawl brand fetch for richer colors/fonts
            dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'brand', label: 'Brand Extract' } });
            fetch('/api/brand', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domain: data.discoveredDomain }),
            })
              .then((r) => r.json())
              .then((d) => {
                dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'brand', status: 'done' } });
                dispatch({
                  type: 'UPDATE_BUSINESS',
                  payload: {
                    logoUrl: d.logoUrl ?? data.logo ?? null,
                    brandColors: d.colors?.length > 1 ? d.colors : data.colors ?? ['#FFFFFF'],
                    fonts: d.fonts ?? [],
                    ogImage: d.ogImage ?? null,
                    favicon: d.favicon ?? null,
                    websiteImages: d.websiteImages ?? [],
                  },
                });
              })
              .catch(() => {
                dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'brand', status: 'error' } });
              });
          }
        })
        .catch(() => {
          dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'instagram', status: 'error' } });
        });
    } else {
      // Standard domain or booking URL: use Firecrawl brand fetch
      const brandBody: Record<string, string> = {};
      if (domain) {
        brandBody.domain = domain;
      } else if (uriResult.type === 'booking') {
        brandBody.bookingUrl = uriResult.originalUrl;
        brandBody.businessName = place.displayName;
      }

      brandPromiseRef.current = Object.keys(brandBody).length > 0
        ? fetch('/api/brand', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(brandBody),
          })
            .then((res) => res.json())
            .then((data) => {
              dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'brand', status: 'done' } });
              const resolvedDomain = data.discoveredDomain ?? domain ?? '';
              if (resolvedDomain) {
                domainRef.current = resolvedDomain;
                // If domain was discovered from booking URL, fire screenshot for the real domain
                if (data.discoveredDomain && !domain) {
                  dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'screenshot', label: 'Website Screenshot' } });
                  screenshotPromiseRef.current = fetch('/api/screenshot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ domain: data.discoveredDomain }),
                  })
                    .then((r) => r.json())
                    .then((d) => {
                      dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'screenshot', status: 'done' } });
                      if (d.screenshot) {
                        dispatch({ type: 'UPDATE_BUSINESS', payload: { screenshot: d.screenshot } });
                      }
                    })
                    .catch(() => {
                      dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'screenshot', status: 'error' } });
                    });
                }
              }
              dispatch({
                type: 'UPDATE_BUSINESS',
                payload: {
                  name: place.displayName,
                  logoUrl: data.logoUrl ?? null,
                  domain: resolvedDomain,
                  brandColors: data.colors ?? ['#FFFFFF'],
                  fonts: data.fonts ?? [],
                  ogImage: data.ogImage ?? null,
                  favicon: data.favicon ?? null,
                  websiteImages: data.websiteImages ?? [],
                },
              });
            })
            .catch(() => {
              dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'brand', status: 'error' } });
            })
        : Promise.resolve();
    }

    // Fire chain discovery in background (no await — map-scanning shows pins as they arrive)
    chainPromiseRef.current = fetch('/api/places/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: buildChainQuery(place),
        ...(domain && { websiteDomain: domain }),
      }),
    })
      .then((res) => res.json() as Promise<TextSearchResponse>)
      .then((chainResult) => {
        dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'places', status: 'done' } });

        const chainLocations: LocationItem[] = (chainResult.places ?? []).map((p: PlaceSummary) => {
          const firstSegment = (p.formattedAddress ?? '').split(',')[0].trim();
          const streetName = firstSegment.replace(/\s*\d[\d\w/-]*$/, '').trim();
          const locationLabel = streetName
            ? `${place.displayName} - ${streetName}`
            : p.displayName;

          return {
            id: p.placeId,
            name: locationLabel,
            address: p.formattedAddress,
            countryCode: p.countryCode,
            lat: p.location.lat,
            lng: p.location.lng,
            userRatingCount: p.userRatingCount,
            rating: p.rating,
          };
        });

        const filteredLocations = domain
          ? chainLocations
          : chainLocations.filter(loc => !place.countryCode || loc.countryCode === place.countryCode);

        const selectedCountry = place.countryCode;
        filteredLocations.sort((a, b) => {
          if (a.countryCode === selectedCountry && b.countryCode !== selectedCountry) return -1;
          if (b.countryCode === selectedCountry && a.countryCode !== selectedCountry) return 1;
          return (a.countryCode ?? '').localeCompare(b.countryCode ?? '');
        });

        dispatch({ type: 'SET_LOCATIONS', payload: filteredLocations });
        dispatch({ type: 'SET_CHAIN_DISCOVERY_DONE' });

        // Fire place details in background
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
            const allPhotos = allDetails.flatMap((d) => d.photos ?? []);
            if (allPhotos.length > 0) {
              dispatch({ type: 'UPDATE_GATHERING_DATA', payload: { photos: allPhotos } });
            }
          })
          .catch(() => {});
      })
      .catch(() => {
        dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'places', status: 'error' } });
        dispatch({ type: 'SET_CHAIN_DISCOVERY_DONE' });
      });

    dispatch({ type: 'SET_LOADING', payload: false });
    goForward('map-scanning');
  }, [dispatch]);

  // Auto-submit when URL params are present (e.g. ?place_id=...&name=...&address=...)
  // Fetches full place details from Google first so chain discovery has website/location data
  useEffect(() => {
    if (autoSubmittedRef.current) return;

    const placeId = searchParams.get('place_id');
    const name = searchParams.get('name');
    if (!placeId || !name) return;

    autoSubmittedRef.current = true;
    dispatch({ type: 'SET_LOADING', payload: true });

    // Enrich from Google Places so we get websiteUri, countryCode, proper lat/lng
    fetch('/api/places/details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeIds: [placeId] }),
    })
      .then((res) => res.json() as Promise<PlaceDetailsResponse>)
      .then((data) => {
        const detail = data.details?.[0];
        const place: PlaceSummary = {
          placeId,
          displayName: detail?.displayName ?? name,
          formattedAddress: detail?.formattedAddress ?? searchParams.get('address') ?? '',
          websiteUri: detail?.websiteUri ?? searchParams.get('website') ?? undefined,
          countryCode: detail?.countryCode,
          userRatingCount: detail?.userRatingCount,
          rating: detail?.rating,
          location: detail?.location ?? {
            lat: parseFloat(searchParams.get('lat') ?? '0'),
            lng: parseFloat(searchParams.get('lng') ?? '0'),
          },
        };
        handleSearchSubmit(place);
      })
      .catch(() => {
        // Fallback: use URL params as-is
        handleSearchSubmit({
          placeId,
          displayName: name,
          formattedAddress: searchParams.get('address') ?? '',
          websiteUri: searchParams.get('website') ?? undefined,
          location: {
            lat: parseFloat(searchParams.get('lat') ?? '0'),
            lng: parseFloat(searchParams.get('lng') ?? '0'),
          },
        });
      });
  }, [searchParams, handleSearchSubmit, dispatch]);

  const handleMapScanningComplete = useCallback(() => {
    // Don't await chain/brand promises — they continue in the background and
    // downstream steps (photos-scanning, website-scanning) handle their own
    // loading states. Blocking here was the main reason the map step got
    // stuck for a long time when Google Places or Firecrawl was slow.
    if (photosCountRef.current > 0) {
      goForward('photos-scanning');
      return;
    }

    if (domainRef.current) {
      goForward('website-scanning');
    } else {
      goForward('website-prompt');
    }
  }, []);

  const handlePhotosScanningComplete = useCallback(() => {
    if (domainRef.current) {
      goForward('website-scanning');
    } else {
      goForward('website-prompt');
    }
  }, []);

  const handleWebsiteScanningComplete = useCallback(async () => {
    if (brandPromiseRef.current) await brandPromiseRef.current;
    goForward('confirm');
  }, []);

  const handleWebsitePromptSubmit = useCallback((rawUrl: string) => {
    const domain = extractDomain(rawUrl) ?? rawUrl.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain) return;
    domainRef.current = domain;
    dispatch({ type: 'UPDATE_BUSINESS', payload: { domain } });

    dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'screenshot', label: 'Website Screenshot' } });
    screenshotPromiseRef.current = fetch('/api/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    })
      .then((r) => r.json())
      .then((d) => {
        dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'screenshot', status: 'done' } });
        if (d.screenshot) dispatch({ type: 'UPDATE_BUSINESS', payload: { screenshot: d.screenshot } });
      })
      .catch(() => {
        dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'screenshot', status: 'error' } });
      });

    dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'brand', label: 'Brand Extract' } });
    brandPromiseRef.current = fetch('/api/brand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    })
      .then((res) => res.json())
      .then((data) => {
        dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'brand', status: 'done' } });
        dispatch({
          type: 'UPDATE_BUSINESS',
          payload: {
            logoUrl: data.logoUrl ?? null,
            brandColors: data.colors?.length > 0 ? data.colors : ['#FFFFFF'],
            fonts: data.fonts ?? [],
            ogImage: data.ogImage ?? null,
            favicon: data.favicon ?? null,
            websiteImages: data.websiteImages ?? [],
          },
        });
      })
      .catch(() => {
        dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'brand', status: 'error' } });
      });

    goForward('website-scanning');
  }, [dispatch]);

  const handleWebsitePromptSkip = useCallback(() => {
    goForward('confirm');
  }, []);

  const handleConfirm = useCallback(
    (data: { name: string; website: string; colors: string[]; locations: LocationItem[] }) => {
      dispatch({
        type: 'UPDATE_BUSINESS',
        payload: { name: data.name, domain: data.website, brandColors: data.colors },
      });
      dispatch({ type: 'SET_LOCATIONS', payload: data.locations });

      const domain = domainRef.current ?? data.website;
      startBackgroundFetch(domain);

      goForward('mockup');
    },
    [startBackgroundFetch, dispatch],
  );

  const handleBack = useCallback(() => {
    if (step === 'confirm') {
      goBack('search');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [step, dispatch]);

  const showLogo = step === 'search';
  const isShellStep =
    step === 'map-scanning' ||
    step === 'photos-scanning' ||
    step === 'website-prompt' ||
    step === 'website-scanning' ||
    step === 'confirm';
  const showIllustrations = step === 'search';

  return (
    <div
      className={`relative flex flex-col items-center min-h-dvh bg-gray-50/40 font-sans overflow-hidden ${
        step === 'search' ? 'justify-center py-12' : ''
      }`}
    >
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

        {isShellStep && (
          <OnboardingShell
            key="step-shell"
            current={1}
            onBack={step === 'confirm' ? handleBack : undefined}
          >
            <AnimatePresence mode="wait" custom={directionRef.current}>
              {step === 'map-scanning' && (
                <StepMapScanning key="map-scanning" onComplete={handleMapScanningComplete} />
              )}
              {step === 'photos-scanning' && (
                <StepPhotosScanning key="photos-scanning" onComplete={handlePhotosScanningComplete} />
              )}
              {step === 'website-prompt' && (
                <StepWebsitePrompt
                  key="website-prompt"
                  direction={directionRef.current}
                  loading={false}
                  onSubmit={handleWebsitePromptSubmit}
                  onSkip={handleWebsitePromptSkip}
                />
              )}
              {step === 'website-scanning' && (
                <StepWebsiteScanning key="website-scanning" onComplete={handleWebsiteScanningComplete} />
              )}
              {step === 'confirm' && (
                <StepConfirm
                  key="confirm"
                  direction={directionRef.current}
                  onConfirm={handleConfirm}
                />
              )}
            </AnimatePresence>
          </OnboardingShell>
        )}

        {step === 'mockup' && business && (
          <StepMockup key="step-mockup" />
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

      {process.env.NODE_ENV !== 'production' && <FetchTimingsDebug timings={fetchTimings} />}
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
    <div className="fixed bottom-4 right-4 z-[9999] bg-black/80 text-white rounded-xl px-4 py-3 text-xs font-mono backdrop-blur-sm min-w-[280px] max-w-[420px]">
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
