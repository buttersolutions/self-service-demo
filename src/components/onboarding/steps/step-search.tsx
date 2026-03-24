'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { OnboardingInput, OnboardingButton, PaginationDots } from '../ui';
import { stepVariants, childVariants } from '../constants';
import type { PlaceSummary } from '@/lib/types';

interface StepSearchProps {
  direction: number;
  initialPlace?: PlaceSummary | null;
  onSubmit: (place: PlaceSummary) => void;
  loading: boolean;
}

export function StepSearch({ direction, initialPlace, onSubmit, loading }: StepSearchProps) {
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(initialPlace ?? null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handlePlaceChanged = useCallback(() => {
    const ac = autocompleteRef.current;
    if (!ac) return;

    const place = ac.getPlace();
    if (!place.place_id || !place.geometry?.location) return;

    const summary: PlaceSummary = {
      placeId: place.place_id,
      displayName: place.name ?? '',
      formattedAddress: place.formatted_address ?? '',
      websiteUri: place.website,
      types: place.types,
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

      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment'],
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'website',
          'geometry.location',
          'types',
        ],
      });

      ac.addListener('place_changed', handlePlaceChanged);
      autocompleteRef.current = ac;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const circle = new google.maps.Circle({
              center: { lat: latitude, lng: longitude },
              radius: 50000,
            });
            ac.setBounds(circle.getBounds()!);
          },
          () => {},
        );
      }

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
          onChange={() => setSelectedPlace(null)}
        />
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

      <motion.div
        className="mt-auto pt-16 flex flex-col items-center gap-6"
        variants={childVariants}
      >
        <PaginationDots total={3} current={0} />
      </motion.div>
    </motion.div>
  );
}
