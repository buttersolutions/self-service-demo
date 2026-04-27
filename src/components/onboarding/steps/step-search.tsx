'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { OnboardingInput, OnboardingButton } from '../ui';
import { stepVariants, childVariants } from '../constants';
import type { PlaceSummary } from '@/lib/types';
import { EU_COUNTRY_CODES, EU_BOUNDS_SW, EU_BOUNDS_NE } from '@/lib/eu';

interface StepSearchProps {
  direction: number;
  initialPlace?: PlaceSummary | null;
  onSubmit: (place: PlaceSummary) => void;
  loading: boolean;
}

export function StepSearch({ direction, initialPlace, onSubmit, loading }: StepSearchProps) {
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(initialPlace ?? null);
  const [regionError, setRegionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handlePlaceChanged = useCallback(() => {
    const ac = autocompleteRef.current;
    if (!ac) return;

    const place = ac.getPlace();
    if (!place.place_id || !place.geometry?.location) return;

    const countryComponent = place.address_components?.find((c) =>
      c.types.includes('country'),
    );
    const countryCode = countryComponent?.short_name?.toLowerCase();

    // Reject picks that fell inside the EU bounding rectangle but aren't
    // actually EU-27 (UK, Norway, Switzerland, Iceland, etc.).
    if (!countryCode || !EU_COUNTRY_CODES.has(countryCode)) {
      setSelectedPlace(null);
      setRegionError('Please pick a business located in the EU.');
      return;
    }

    setRegionError(null);

    const summary: PlaceSummary = {
      placeId: place.place_id,
      displayName: place.name ?? '',
      formattedAddress: place.formatted_address ?? '',
      websiteUri: place.website,
      types: place.types,
      countryCode,
      location: {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      },
    };

    setSelectedPlace(summary);
  }, []);

  useEffect(() => {
    if (autocompleteRef.current) return;

    function init() {
      if (!window.google?.maps?.places || !inputRef.current) return false;

      const euBounds = new google.maps.LatLngBounds(EU_BOUNDS_SW, EU_BOUNDS_NE);

      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment'],
        bounds: euBounds,
        strictBounds: true,
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'website',
          'geometry.location',
          'types',
          'address_components',
        ],
      });

      ac.addListener('place_changed', handlePlaceChanged);
      autocompleteRef.current = ac;

      return true;
    }

    if (init()) return;

    const interval = setInterval(() => {
      if (init()) clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, [handlePlaceChanged]);

  const handleSubmit = () => {
    if (selectedPlace && !loading) {
      onSubmit(selectedPlace);
    }
  };

  return (
    <>
    <motion.div
      className="flex flex-col items-center w-full max-w-[640px] mx-auto px-8"
      custom={direction}
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.h1
        className="text-[24px] font-bold text-gray-900 mb-6 tracking-[-0.01em] w-full text-center font-serif"
        variants={childVariants}
      >
        Find your business
      </motion.h1>

      <motion.div
        className={`w-full transition-opacity duration-300 ${loading ? 'opacity-60' : ''}`}
        variants={childVariants}
      >
        <OnboardingInput
          ref={inputRef}
          type="text"
          placeholder="Start typing your business name..."
          defaultValue={initialPlace?.displayName ?? ''}
          disabled={loading}
          autoFocus
          onChange={() => {
            setSelectedPlace(null);
            setRegionError(null);
          }}
        />
        {regionError && (
          <p className="mt-2 text-xs text-red-500 text-center">{regionError}</p>
        )}
      </motion.div>

      <motion.div className="w-full mt-6" variants={childVariants}>
        <OnboardingButton
          active={!!selectedPlace}
          loading={loading}
          loadingText="Finding your locations..."
          onClick={handleSubmit}
          disabled={!selectedPlace}
        >
          Get Started
        </OnboardingButton>
      </motion.div>

    </motion.div>
    </>
  );
}
