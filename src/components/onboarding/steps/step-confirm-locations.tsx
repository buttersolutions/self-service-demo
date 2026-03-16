'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Loader2 } from 'lucide-react';
import { OnboardingInput, OnboardingButton } from '../ui';
import { stepVariants, childVariants } from '../constants';
import { Button } from '@/components/ui/button';

import type { LocationItem } from '../types';

const BUTTON_LOADING_MS = 3000;

interface StepConfirmLocationsProps {
  direction: number;
  locations: LocationItem[];
  onConfirm: (locations: LocationItem[]) => void;
}

const itemVariants = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 12, height: 0, marginBottom: 0 },
};

let nextId = 100;

function extractCountryCode(
  place: google.maps.places.PlaceResult,
): string | undefined {
  const country = place.address_components?.find((c) =>
    c.types.includes('country'),
  );
  return country?.short_name?.toLowerCase();
}

function AddLocationAutocomplete({
  onPlaceSelected,
}: {
  onPlaceSelected: (location: LocationItem) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handlePlaceChanged = useCallback(() => {
    const ac = autocompleteRef.current;
    if (!ac) return;

    const place = ac.getPlace();
    if (!place.place_id || !place.geometry?.location) return;

    nextId += 1;
    onPlaceSelected({
      id: place.place_id,
      name: place.name ?? '',
      address: place.formatted_address ?? '',
      countryCode: extractCountryCode(place),
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    });

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onPlaceSelected]);

  useEffect(() => {
    if (autocompleteRef.current) return;

    function init() {
      if (!window.google?.maps?.places || !inputRef.current) return false;

      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'geometry.location',
          'address_components',
        ],
      });

      ac.addListener('place_changed', handlePlaceChanged);
      autocompleteRef.current = ac;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const bias = new google.maps.Circle({
              center: { lat: latitude, lng: longitude },
              radius: 50000,
            });
            ac.setBounds(bias.getBounds()!);
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

  return (
    <OnboardingInput
      ref={inputRef}
      type="text"
      placeholder="Search for an address to add..."
    />
  );
}

export function StepConfirmLocations({
  direction,
  locations: initialLocations,
  onConfirm,
}: StepConfirmLocationsProps) {
  const [locations, setLocations] = useState<LocationItem[]>(initialLocations);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);

  const handleGetApp = useCallback(() => {
    setButtonLoading(true);
    setTimeout(() => onConfirm(locations), BUTTON_LOADING_MS);
  }, [locations, onConfirm]);

  const updateName = (id: string, newName: string) => {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, name: newName } : loc)),
    );
  };

  const removeLocation = (id: string) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
  };

  const addLocation = useCallback((location: LocationItem) => {
    setLocations((prev) => {
      if (prev.some((l) => l.id === location.id)) return prev;
      return [...prev, location];
    });
    setShowAddInput(false);
  }, []);

  const valid = locations.length > 0 && locations.every((loc) => loc.name.trim().length > 0);

  return (
    <motion.div
      className="flex flex-col items-center w-full max-w-[640px] mx-auto px-8 max-h-[calc(100dvh-96px)]"
      custom={direction}
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div className="w-full mb-6 shrink-0" variants={childVariants}>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-[-0.01em] font-serif">
          3. Confirm your locations
        </h1>
        <p className="text-[14px] text-gray-500 mt-2 leading-relaxed">
          We found <span className="font-semibold text-gray-700">{initialLocations.length} locations</span> matching your business. They will be set up as workplaces in the app. Feel free to rename, remove, or add any that are missing.
        </p>
      </motion.div>

      <motion.div
        className="w-full overflow-y-auto min-h-0 space-y-3 pr-1 pb-4"
        variants={childVariants}
      >
        <AnimatePresence initial={false}>
          {locations.map((loc, i) => (
            <motion.div
              key={loc.id}
              variants={itemVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="flex items-start gap-2"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <OnboardingInput
                      value={loc.name}
                      onChange={(e) => updateName(loc.id, e.target.value)}
                      placeholder="Location name"
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeLocation(loc.id)}>
                    <X className="size-4" />
                  </Button>
                </div>
                {loc.address && (
                  <p className="flex p-2 items-center gap-2 text-[11px] text-gray-400 mt-0.5 ml-1 line-clamp-2">
                    {loc.countryCode && (
                      <img
                        src={`https://flagcdn.com/${loc.countryCode}.svg`}
                        width={16}
                        height={12}
                        alt={loc.countryCode.toUpperCase()}
                        className="shrink-0 rounded-[2px]"
                      />
                    )}
                    {loc.address}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {showAddInput ? (
            <motion.div
              key="add-input"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden pt-1"
            >
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <AddLocationAutocomplete onPlaceSelected={addLocation} />
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowAddInput(false)}>
                  <X className="size-4" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="add-button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Button variant="outline" size="sm" onClick={() => setShowAddInput(true)}>
                <Plus className="size-4" />
                Add location
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="w-full shrink-0 sticky bottom-0 z-10 bg-white rounded-2xl py-4 mt-4"
        variants={childVariants}
      >
        <OnboardingButton active={valid} disabled={!valid || buttonLoading} onClick={handleGetApp}>
          {buttonLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Preparing...
            </span>
          ) : (
            'Get my branded app'
          )}
        </OnboardingButton>
      </motion.div>
    </motion.div>
  );
}
