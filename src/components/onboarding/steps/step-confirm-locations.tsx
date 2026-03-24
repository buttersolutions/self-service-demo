'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Loader2 } from 'lucide-react';
import { OnboardingButton, OnboardingInput } from '../ui';
import { stepVariants, childVariants } from '../constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

import type { LocationItem } from '../types';

const BUTTON_LOADING_MS = 3000;

interface StepConfirmLocationsProps {
  direction: number;
  locations: LocationItem[];
  onEarlyStart?: (locations: LocationItem[]) => void;
  onConfirm: (locations: LocationItem[]) => void;
}

let nextId = 100;

function extractCountryCode(
  place: google.maps.places.PlaceResult,
): string | undefined {
  const country = place.address_components?.find((c) =>
    c.types.includes('country'),
  );
  return country?.short_name?.toLowerCase();
}

// ── Location badge with tooltip ──────────────────────────────────────

function LocationBadge({
  location,
  onRemove,
}: {
  location: LocationItem;
  onRemove: (id: string) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>
        <Badge variant="outline" className="h-auto bg-white gap-1.5 py-1.5 px-3 text-sm cursor-default">
          {location.countryCode && (
            <img
              src={`https://flagcdn.com/${location.countryCode}.svg`}
              width={16}
              height={12}
              alt={location.countryCode.toUpperCase()}
              className="shrink-0 rounded-[2px]"
            />
          )}
          <span className="truncate max-w-[200px]">{location.name}</span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(location.id);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onRemove(location.id); } }}
            className="ml-0.5 rounded-md cursor-pointer p-0.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-3" />
          </span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6} className="font-sans">
        {location.address}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Add location autocomplete ────────────────────────────────────────

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

// ── Main component ───────────────────────────────────────────────────

export function StepConfirmLocations({
  direction,
  locations: initialLocations,
  onEarlyStart,
  onConfirm,
}: StepConfirmLocationsProps) {
  const [locations, setLocations] = useState<LocationItem[]>(initialLocations);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);

  const handleGetApp = useCallback(() => {
    setButtonLoading(true);
    onEarlyStart?.(locations);
    setTimeout(() => onConfirm(locations), BUTTON_LOADING_MS);
  }, [locations, onConfirm, onEarlyStart]);

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
      className="w-full max-w-[640px] mx-auto px-8"
      custom={direction}
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div className="w-full mb-6" variants={childVariants}>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-[-0.01em] font-serif">
Are these all your locations?        </h1>
        <p className="text-[14px] text-gray-500 mt-2 leading-relaxed">
          We found <span className="font-semibold text-gray-700">{initialLocations.length} locations.</span>. We need all of them to analyze reviews and build your app.
        </p>
      </motion.div>

      <motion.div className="w-full pb-4" variants={childVariants}>
        {/* Badge grid */}
        <TooltipProvider>
          <div className="flex flex-wrap gap-2 mb-4">
            {locations.map((loc) => (
              <LocationBadge key={loc.id} location={loc} onRemove={removeLocation} />
            ))}
          </div>
        </TooltipProvider>

        {/* Add location */}
        <AnimatePresence mode="wait">
          {showAddInput ? (
            <motion.div
              key="add-input"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
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
              <Badge
                variant="outline"
                className="h-auto bg-white gap-1.5 py-1.5 px-3 text-sm cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setShowAddInput(true)}
              >
                <Plus className="size-3.5 text-muted-foreground" />
                <span>Add location</span>
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div className="w-full pt-4" variants={childVariants}>
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
