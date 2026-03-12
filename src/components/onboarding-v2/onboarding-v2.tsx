'use client';

import { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AllgravyLogo } from '@/components/ui/allgravy-logo';
import { StepSearch, StepConfirmBusiness, StepConfirmLocations } from './steps';
import type { BusinessData } from './steps/step-confirm-business';
import type { LocationItem } from './steps/step-confirm-locations';
import type { PlaceSummary, TextSearchResponse } from '@/lib/types';

type Step = 'search' | 'confirm-business' | 'confirm-locations';

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

export function OnboardingV2() {
  const [step, setStep] = useState<Step>('search');
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(null);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const directionRef = useRef(1);

  const goForward = (next: Step) => {
    directionRef.current = 1;
    setStep(next);
  };

  const goBack = (prev: Step) => {
    directionRef.current = -1;
    setStep(prev);
  };

  const handleSearchSubmit = useCallback(async (place: PlaceSummary) => {
    setSelectedPlace(place);
    setLoading(true);

    const domain = extractDomain(place.websiteUri);

    try {
      const [chainResult, brandResult] = await Promise.all([
        fetch('/api/places/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: buildChainQuery(place),
            ...(domain && { websiteDomain: domain }),
          }),
        }).then((res) => res.json() as Promise<TextSearchResponse>),

        domain
          ? fetch('/api/brand', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domain }),
            }).then((res) => res.json())
          : Promise.resolve({ name: null, logoUrl: null, colors: ['#FFFFFF'] }),
      ]);

      const chainLocations: LocationItem[] = (chainResult.places ?? []).map((p: PlaceSummary) => ({
        id: p.placeId,
        name: p.displayName,
        address: p.formattedAddress,
      }));

      setLocations(chainLocations);

      setBusiness({
        name: brandResult.name ?? place.displayName,
        logoUrl: brandResult.logoUrl ?? null,
        domain: domain ?? '',
        brandColors: brandResult.colors ?? ['#FFFFFF'],
      });

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
      goForward('confirm-locations');
    },
    [business],
  );

  const handleLocationsConfirm = useCallback((_locs: LocationItem[]) => {
    // Future: advance to next step
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'confirm-locations') {
      goBack('confirm-business');
    } else if (step === 'confirm-business') {
      goBack('search');
      setLoading(false);
    }
  }, [step]);

  const showBack = step !== 'search';

  return (
    <div className="relative flex flex-col items-center justify-center min-h-dvh bg-gray-50/40 py-12 font-sans overflow-hidden">
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
        {step === 'search' && (
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
      </AnimatePresence>

      <motion.img
        src="/ag-rocket.svg"
        alt=""
        className="fixed bottom-6 left-6 pointer-events-none select-none"
        animate={floatRocket}
      />
      <motion.img
        src="/ag-pineapple.svg"
        alt=""
        className="fixed top-12 right-12 pointer-events-none select-none"
        animate={floatPineapple}
      />
    </div>
  );
}
