'use client';

import { useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AllgravyLogo } from '@/components/ui/allgravy-logo';
import {
  StepSearch,
  StepFeedbackAnalysis,
  StepFeedbackConfirm,
  StepMockup,
} from './steps';
import type { LocationItem, ReviewItem, Step } from './types';
import type {
  PlaceSummary,
  TextSearchResponse,
  PlaceDetailsResponse,
} from '@/lib/types';
import {
  OnboardingProvider,
  useOnboarding,
  type PipelineStage,
} from '@/lib/demo-flow-context';
import { classifyWebsiteUri } from '@/lib/domain-utils';

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

const INITIAL_PIPELINE_STAGES: PipelineStage[] = [
  { id: 'fetch', label: 'Fetching reviews from Google', status: 'pending' },
  { id: 'classify', label: 'Categorising reviews', status: 'pending' },
  { id: 'aggregate', label: 'Computing insights & themes', status: 'pending' },
  { id: 'select', label: 'Picking key themes', status: 'pending' },
  { id: 'findings', label: 'Writing findings', status: 'pending' },
  { id: 'strengths', label: 'Writing strengths', status: 'pending' },
  { id: 'recommendations', label: 'Drafting recommendations', status: 'pending' },
  { id: 'summary', label: 'Writing executive summary', status: 'pending' },
  { id: 'finalize', label: 'Assembling report', status: 'pending' },
];

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

export function OnboardingFeedback() {
  return (
    <OnboardingProvider>
      <Suspense>
        <OnboardingFeedbackInner />
      </Suspense>
    </OnboardingProvider>
  );
}

function OnboardingFeedbackInner() {
  const { state, dispatch } = useOnboarding();
  const { step, loading, selectedPlace } = state;

  const searchParams = useSearchParams();
  const directionRef = useRef(1);
  const domainRef = useRef<string | undefined>(undefined);
  const autoSubmittedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const goForward = (next: Step) => {
    directionRef.current = 1;
    dispatch({ type: 'SET_STEP', payload: next });
  };

  // ── Background fetches ────────────────────────────────────────────────

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
    dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'reviews', label: 'Apify Reviews' } });
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
        const apifyReviews: ReviewItem[] = data.reviews ?? [];
        dispatch({ type: 'MERGE_REVIEWS', payload: apifyReviews });
        dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'reviews', status: 'done' } });
      })
      .catch((err: unknown) => {
        dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'reviews', status: 'error', errorMessage: err instanceof Error ? err.message : 'Unknown error' } });
      });
  }, [dispatch]);

  /**
   * Drives the new feedback analysis SSE stream and dispatches stage updates
   * into context as the pipeline progresses. Mirrors the local stage logic in
   * /gathering/page.tsx but writes to OnboardingState.pipelineStages.
   */
  const startFeedbackAnalysisFetch = useCallback((place: PlaceSummary) => {
    const trackKey = 'feedbackAnalysis';
    dispatch({ type: 'TRACK_FETCH_START', payload: { key: trackKey, label: 'Guest Feedback Analysis' } });
    dispatch({ type: 'INIT_PIPELINE_STAGES', payload: INITIAL_PIPELINE_STAGES });
    dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'fetch', status: 'active' } });

    let reviewCount = 0;
    let categorizedCount = 0;

    fetch('/api/demo/scan/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: [{
          placeId: place.placeId,
          displayName: place.displayName,
          formattedAddress: place.formattedAddress,
          location: place.location,
          rating: place.rating,
          userRatingCount: place.userRatingCount,
        }],
      }),
    })
      .then(async (res) => {
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        dispatch({ type: 'TRACK_SSE_EVENT', payload: { key: trackKey, event: `connected (${res.status})` } });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';

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
              if (line.startsWith('event: ')) eventName = line.slice(7).trim();
              else if (line.startsWith('data: ')) eventData = line.slice(6);
            }
            if (!eventName && currentEvent) eventName = currentEvent;
            if (eventName) currentEvent = eventName;
            if (!eventName || !eventData) continue;

            try {
              const data = JSON.parse(eventData);

              if (eventName === 'reviews_progress') {
                reviewCount += data.reviewCount ?? 0;
                dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'fetch', status: 'active', label: `Found ${reviewCount} reviews` } });
                dispatch({ type: 'APPEND_REVIEW_PROGRESS', payload: { placeId: data.placeId, displayName: data.displayName, reviewCount: data.reviewCount, sort: data.sort } });
              } else if (eventName === 'batch_analysis') {
                const catCount = data.categorized?.length ?? data.insights?.length ?? 0;
                categorizedCount += catCount;
                dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'fetch', status: 'done', label: `Found ${reviewCount} reviews` } });
                dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'classify', status: 'active', label: `Categorised ${categorizedCount} reviews` } });
                if (data.insights) {
                  dispatch({ type: 'APPEND_REVIEW_INSIGHTS', payload: data.insights });
                }
              } else if (eventName === 'aggregates') {
                dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'classify', status: 'done' } });
                dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'aggregate', status: 'active', label: 'Computing insights & themes' } });
              } else if (eventName === 'analysis_update') {
                if (data.executive_summary !== undefined) {
                  dispatch({ type: 'SET_GUEST_FEEDBACK_REPORT_PREVIEW', payload: data });
                }
              } else if (eventName === 'analysis') {
                if (data.executive_summary !== undefined) {
                  dispatch({ type: 'SET_GUEST_FEEDBACK_REPORT', payload: data });
                  dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'finalize', status: 'done' } });

                  // Persist to Supabase (fire-and-forget)
                  fetch('/api/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      report: data,
                      business: stateRef.current.business,
                      locations: stateRef.current.locations,
                    }),
                  })
                    .then((r) => r.json())
                    .then(({ id }) => { if (id) dispatch({ type: 'SET_REPORT_ID', payload: id }); })
                    .catch(() => {});
                }
              } else if (eventName === 'log') {
                const msg = data.message ?? '';
                if (msg.includes('Aggregated:')) {
                  dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'aggregate', status: 'done' } });
                  dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'select', status: 'active', label: 'Picking key themes' } });
                } else if (msg.includes('Selector: picked')) {
                  dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'select', status: 'done' } });
                } else if (msg.includes('Firing') && msg.includes('finding writers')) {
                  dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'findings', status: 'active', label: 'Writing findings' } });
                  dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'strengths', status: 'active', label: 'Writing strengths' } });
                  dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'recommendations', status: 'active', label: 'Drafting recommendations' } });
                  dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'summary', status: 'active', label: 'Writing executive summary' } });
                } else if (msg.includes('Finding writer') && msg.includes('chars in')) {
                  dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'findings', status: 'done' } });
                } else if (msg.includes('Strengths writer:') && msg.includes('chars in')) {
                  dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'strengths', status: 'done' } });
                } else if (msg.includes('Recommendations writer:') && msg.includes('chars in')) {
                  dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'recommendations', status: 'done' } });
                } else if (msg.includes('Exec summary writer:') && msg.includes('chars in')) {
                  dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'summary', status: 'done' } });
                  dispatch({ type: 'UPDATE_PIPELINE_STAGE', payload: { id: 'finalize', status: 'active', label: 'Assembling report' } });
                }
              } else if (eventName === 'error') {
                dispatch({ type: 'TRACK_SSE_EVENT', payload: { key: trackKey, event: `ERROR: ${data.message ?? JSON.stringify(data)}` } });
              }
            } catch {
              dispatch({ type: 'TRACK_SSE_EVENT', payload: { key: trackKey, event: `parse-error: ${eventName}` } });
            }
          }
        }

        dispatch({ type: 'TRACK_FETCH_END', payload: { key: trackKey, status: 'done' } });
      })
      .catch((err: unknown) => {
        dispatch({ type: 'TRACK_FETCH_END', payload: { key: trackKey, status: 'error', errorMessage: err instanceof Error ? err.message : 'Unknown error' } });
      });
  }, [dispatch]);

  // ── Search submit: fire all parallel work, jump straight to analysis ──

  const handleSearchSubmit = useCallback(async (place: PlaceSummary) => {
    dispatch({ type: 'SET_SELECTED_PLACE', payload: place });
    dispatch({ type: 'SET_LOADING', payload: true });

    const uriResult = classifyWebsiteUri(place.websiteUri);
    const domain = uriResult.type === 'domain' ? uriResult.domain : undefined;
    domainRef.current = domain;

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

    // Set initial business + locations
    dispatch({
      type: 'SET_BUSINESS',
      payload: {
        name: place.displayName,
        logoUrl: null,
        domain: domain ?? '',
        brandColors: ['#FFFFFF'],
      },
    });
    dispatch({ type: 'SET_LOCATIONS', payload: [primaryLoc] });

    // Fire the headline feedback analysis SSE stream
    startFeedbackAnalysisFetch(place);

    // Fire all branding work in parallel in the background
    if (domain) {
      startBackgroundFetch(domain);

      dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'screenshot', label: 'Website Screenshot' } });
      fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
        .then((res) => res.json())
        .then((data) => {
          dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'screenshot', status: 'done' } });
          if (data.screenshot) dispatch({ type: 'UPDATE_BUSINESS', payload: { screenshot: data.screenshot } });
        })
        .catch(() => dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'screenshot', status: 'error' } }));
    }

    if (uriResult.type === 'social') {
      dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'instagram', label: 'Instagram Profile' } });
      fetch('/api/instagram', {
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
          if (data.discoveredDomain) {
            domainRef.current = data.discoveredDomain;
            dispatch({ type: 'UPDATE_BUSINESS', payload: { domain: data.discoveredDomain } });
            startBackgroundFetch(data.discoveredDomain);
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
              .catch(() => dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'brand', status: 'error' } }));
          }
        })
        .catch(() => dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'instagram', status: 'error' } }));
    } else {
      const brandBody: Record<string, string> = {};
      if (domain) {
        brandBody.domain = domain;
      } else if (uriResult.type === 'booking') {
        brandBody.bookingUrl = uriResult.originalUrl;
        brandBody.businessName = place.displayName;
      }
      if (Object.keys(brandBody).length > 0) {
        dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'brand', label: 'Brand Extract' } });
        fetch('/api/brand', {
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
              if (data.discoveredDomain && !domain) {
                startBackgroundFetch(data.discoveredDomain);
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
          .catch(() => dispatch({ type: 'TRACK_FETCH_END', payload: { key: 'brand', status: 'error' } }));
      }
    }

    // Chain discovery — quietly populate additional locations + photos
    dispatch({ type: 'TRACK_FETCH_START', payload: { key: 'places', label: 'Google Places Search' } });
    fetch('/api/places/search', {
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
          const locationLabel = streetName ? `${place.displayName} - ${streetName}` : p.displayName;
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
          : chainLocations.filter((loc) => !place.countryCode || loc.countryCode === place.countryCode);
        const selectedCountry = place.countryCode;
        filteredLocations.sort((a, b) => {
          if (a.countryCode === selectedCountry && b.countryCode !== selectedCountry) return -1;
          if (b.countryCode === selectedCountry && a.countryCode !== selectedCountry) return 1;
          return (a.countryCode ?? '').localeCompare(b.countryCode ?? '');
        });
        dispatch({ type: 'SET_LOCATIONS', payload: filteredLocations });
        dispatch({ type: 'SET_CHAIN_DISCOVERY_DONE' });

        // Fetch place details (photos) for the mockup
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

    // Also fire the lite reviews fetch so the mockup has review snippets
    startReviewsFetch([place.placeId]);

    dispatch({ type: 'SET_LOADING', payload: false });
    goForward('feedback-analysis');
  }, [dispatch, startFeedbackAnalysisFetch, startBackgroundFetch, startReviewsFetch]);

  // Auto-submit when URL params are present
  useEffect(() => {
    if (autoSubmittedRef.current) return;
    const placeId = searchParams.get('place_id');
    const name = searchParams.get('name');
    if (!placeId || !name) return;
    autoSubmittedRef.current = true;
    dispatch({ type: 'SET_LOADING', payload: true });

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

  // ── Step transitions ──────────────────────────────────────────────────

  const handleAnalysisReady = useCallback(() => {
    goForward('feedback-confirm');
  }, []);

  const handleConfirm = useCallback(
    (data: { name: string; website: string; colors: string[]; locations: LocationItem[] }) => {
      dispatch({
        type: 'UPDATE_BUSINESS',
        payload: { name: data.name, domain: data.website, brandColors: data.colors },
      });
      dispatch({ type: 'SET_LOCATIONS', payload: data.locations });

      // Fire full reviews for any newly added locations (parity with flow 1)
      if (data.locations.length > 0) {
        startReviewsFetch(data.locations.map((l) => l.id));
      }

      goForward('mockup');
    },
    [dispatch, startReviewsFetch],
  );

  // ── Render ────────────────────────────────────────────────────────────

  const showLogo = step === 'search';
  const showIllustrations = step === 'search';
  const isFullBleed = step !== 'search';

  return (
    <div className={`relative flex flex-col items-center min-h-dvh bg-gray-50/40 font-sans ${isFullBleed ? 'overflow-hidden' : 'overflow-y-auto justify-center py-12'}`}>
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
            progressVariant="feedback"
          />
        )}

        {step === 'feedback-analysis' && (
          <StepFeedbackAnalysis
            key="step-feedback-analysis"
            onReady={handleAnalysisReady}
          />
        )}

        {step === 'feedback-confirm' && (
          <StepFeedbackConfirm
            key="step-feedback-confirm"
            onConfirm={handleConfirm}
          />
        )}

        {step === 'mockup' && (
          <StepMockup key="step-mockup" />
        )}
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
    </div>
  );
}
