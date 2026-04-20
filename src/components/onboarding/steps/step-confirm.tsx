'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Loader2 } from 'lucide-react';
import Color from 'color';
import { OnboardingInput, OnboardingButton } from '../ui';
import { stepVariants, childVariants, popVariants } from '../constants';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerOutput,
} from '@/components/kibo-ui/color-picker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useOnboarding } from '@/lib/demo-flow-context';
import { resolveLogo } from '@/lib/safe-logo';
import type { LocationItem } from '../types';

const MAX_COLORS = 3;

/* ── Helpers ─────────────────────────────────────────────────────────── */

function rgbaToHex(rgba: number[]): string {
  const [r, g, b] = rgba.map((v) => Math.round(Math.max(0, Math.min(255, v))));
  return Color.rgb(r, g, b).hex();
}

function extractCountryCode(
  place: google.maps.places.PlaceResult,
): string | undefined {
  const country = place.address_components?.find((c) =>
    c.types.includes('country'),
  );
  return country?.short_name?.toLowerCase();
}

/* ── Color Swatch ────────────────────────────────────────────────────── */

function ColorSwatch({
  color,
  onChange,
  onRemove,
  canRemove,
}: {
  color: string;
  onChange: (hex: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const handlePickerChange = useCallback(
    (rgba: Parameters<typeof Color.rgb>[0]) => {
      onChange(rgbaToHex(rgba as number[]));
    },
    [onChange],
  );

  return (
    <Popover>
      <div className="relative group">
        <PopoverTrigger
          render={<button type="button" />}
          className="size-11 rounded-full border-[2.5px] border-white ring-1 ring-black/[0.08] cursor-pointer transition-transform hover:scale-110"
          style={{ backgroundColor: color }}
        />
        {canRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute -top-1 -right-1 size-4 rounded-full bg-gray-800 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="size-2.5" />
          </button>
        )}
      </div>
      <PopoverContent className="w-72 p-3 font-sans" side="bottom" align="center">
        <ColorPicker defaultValue={color} onChange={handlePickerChange}>
          <ColorPickerSelection className="h-32 rounded-lg" />
          <ColorPickerHue />
          <div className="flex items-center gap-2">
            <ColorPickerEyeDropper />
            <ColorPickerOutput />
            <ColorPickerFormat className="flex-1" />
          </div>
        </ColorPicker>
      </PopoverContent>
    </Popover>
  );
}

/* ── Location Badge ──────────────────────────────────────────────────── */

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

/* ── Add Location Autocomplete ───────────────────────────────────────── */

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

/* ── Main Component ──────────────────────────────────────────────────── */

interface StepConfirmProps {
  direction: number;
  onConfirm: (data: { name: string; website: string; colors: string[]; locations: LocationItem[] }) => void;
  /** When true, the standalone bottom progress bar is not rendered (caller will render its own). */
  /** When true, render as a fragment (no outer scroll wrapper); shell parent provides it. */
  hideProgressBar?: boolean;
}

export function StepConfirm({ direction, onConfirm, hideProgressBar = false }: StepConfirmProps) {
  const { state, dispatch, brandColorMap } = useOnboarding();
  const { business, locations: contextLocations } = state;

  const [name, setName] = useState(business?.name ?? '');
  const [website, setWebsite] = useState(business?.domain ?? '');
  const [colors, setColors] = useState<string[]>(
    (business?.brandColors?.length ?? 0) > 0 ? business!.brandColors.slice(0, MAX_COLORS) : ['#625CE4'],
  );
  const [locations, setLocations] = useState<LocationItem[]>(contextLocations);
  const [showAddInput, setShowAddInput] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);

  // Sync colors when brand data arrives after initial render
  const brandSyncedRef = useRef(false);
  useEffect(() => {
    if (brandSyncedRef.current) return;
    if (
      business?.brandColors &&
      business.brandColors.length > 0 &&
      !(business.brandColors.length === 1 && business.brandColors[0] === '#FFFFFF')
    ) {
      brandSyncedRef.current = true;
      setColors(business.brandColors.slice(0, MAX_COLORS));
    }
  }, [business?.brandColors]);

  // Live-sync local color edits to global business state so the mockup and
  // other downstream consumers always reflect the user's picks, even if they
  // navigate away without pressing the confirm button.
  const firstColorSyncRef = useRef(true);
  useEffect(() => {
    if (firstColorSyncRef.current) {
      firstColorSyncRef.current = false;
      return;
    }
    dispatch({ type: 'UPDATE_BUSINESS', payload: { brandColors: colors } });
  }, [colors, dispatch]);

  // Live brand fetch when user enters a website domain
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleWebsiteChange = useCallback((value: string) => {
    setWebsite(value);
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);

    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 3 || !trimmed.includes('.')) return;

    fetchTimeoutRef.current = setTimeout(() => {
      fetch('/api/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: trimmed }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.colors?.length > 0) {
            setColors(data.colors.slice(0, MAX_COLORS));
          }
          dispatch({
            type: 'SET_BUSINESS',
            payload: {
              name: data.name ?? name,
              logoUrl: data.logoUrl ?? null,
              domain: trimmed,
              brandColors: data.colors ?? ['#FFFFFF'],
              logoDevUrl: data.logoDevUrl ?? null,
              fonts: data.fonts ?? [],
              ogImage: data.ogImage ?? null,
              websiteImages: data.websiteImages ?? [],
            },
          });
        })
        .catch(() => {});
    }, 800);
  }, [dispatch, name]);

  const valid = name.trim().length > 0 && locations.length > 0;

  const handleConfirm = useCallback(() => {
    if (!valid || buttonLoading) return;
    setButtonLoading(true);
    // Lock in the resolved logo choice — whichever URL the cascade picked
    // becomes THE logoUrl everyone downstream uses. This prevents later code
    // paths from re-resolving and potentially landing on a different logo.
    const chosen = resolveLogo(business);
    if (chosen.src && chosen.src !== business?.logoUrl) {
      dispatch({ type: 'UPDATE_BUSINESS', payload: { logoUrl: chosen.src, logoIsLight: false } });
    }
    onConfirm({ name: name.trim(), website: website.trim(), colors, locations });
  }, [valid, buttonLoading, name, website, colors, locations, business, dispatch, onConfirm]);

  const handleColorChange = (index: number, hex: string) => {
    setColors((prev) => prev.map((c, i) => (i === index ? hex : c)));
  };

  const handleAddColor = () => {
    if (colors.length < MAX_COLORS) setColors((prev) => [...prev, '#cccccc']);
  };

  const handleRemoveColor = (index: number) => {
    if (colors.length > 1) setColors((prev) => prev.filter((_, i) => i !== index));
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

  return (
    <div className={hideProgressBar ? 'contents' : 'w-full h-full overflow-y-auto flex items-start justify-center py-12'}>
    <motion.div
      className="flex flex-col items-center w-full max-w-[640px] mx-auto px-8"
      custom={direction}
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Logo / initial */}
      <motion.div
        className="mb-6 flex items-center justify-center"
        variants={popVariants}
      >
        {(() => {
          const logo = resolveLogo(business);
          if (!logo.src) {
            return (
              <div
                className="size-20 rounded-[30px] flex items-center justify-center text-2xl font-bold border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]"
                style={{ backgroundColor: brandColorMap.primaryColor, color: brandColorMap.primaryTextColor }}
              >
                {(business?.name ?? 'A').charAt(0)}
              </div>
            );
          }
          if (logo.isSquareFallback) {
            // logo.dev: curated 128px square asset — fill the frame edge-to-edge
            return (
              <div className="size-20 rounded-[30px] bg-white border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden">
                <img
                  src={logo.src}
                  alt={business?.name ?? ''}
                  className="w-full h-full object-cover"
                />
              </div>
            );
          }
          // Firecrawl logo (detected dark): render natively with height cap for wordmarks
          return (
            <div className="h-20 min-w-20 px-3 rounded-[30px] border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] flex items-center justify-center overflow-hidden bg-white">
              <img
                src={logo.src}
                alt={business?.name ?? ''}
                className="max-h-full w-auto max-w-[220px] object-contain py-3"
              />
            </div>
          );
        })()}
      </motion.div>

      <motion.h1
        className="text-[22px] font-bold text-gray-900 tracking-[-0.01em] mb-6 w-full text-center font-serif"
        variants={childVariants}
      >
        Confirm your details
      </motion.h1>

      <motion.p
        className="text-[14px] text-gray-500 text-center mb-6 -mt-2 leading-relaxed"
        variants={childVariants}
      >
        We&apos;ll use this to brand and customize your app.
      </motion.p>

      <div className="w-full space-y-4">
        {/* Company name */}
        <motion.div variants={childVariants}>
          <label className="block text-[13px] text-gray-500 mb-1.5 ml-1">Company name</label>
          <OnboardingInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your business name"
          />
        </motion.div>

        {/* Website */}
        <motion.div variants={childVariants}>
          <label className="block text-[13px] text-gray-500 mb-1.5 ml-1">Website</label>
          <OnboardingInput
            value={website}
            onChange={(e) => handleWebsiteChange(e.target.value)}
            placeholder="yourbusiness.com"
          />
        </motion.div>

        {/* Brand colors */}
        <motion.div variants={childVariants}>
          <label className="block text-[13px] text-gray-500 mb-1.5 ml-1">Brand colors</label>
          <div className="flex items-center gap-3">
            <AnimatePresence initial={false} mode="popLayout">
              {colors.map((color, i) => (
                <motion.div
                  key={i}
                  layout
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <ColorSwatch
                    color={color}
                    onChange={(hex) => handleColorChange(i, hex)}
                    onRemove={() => handleRemoveColor(i)}
                    canRemove={colors.length > 1}
                  />
                </motion.div>
              ))}

              {colors.length < MAX_COLORS && (
                <motion.button
                  key="add-color"
                  type="button"
                  layout
                  onClick={handleAddColor}
                  className="size-11 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <Plus className="size-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Locations */}
        <motion.div variants={childVariants}>
          <label className="block text-[13px] text-gray-500 mb-1.5 ml-1">
            Locations <span className="text-gray-400">({locations.length})</span>
          </label>
          <TooltipProvider>
            <div className="flex flex-wrap gap-2 mb-3">
              {locations.map((loc) => (
                <LocationBadge key={loc.id} location={loc} onRemove={removeLocation} />
              ))}
            </div>
          </TooltipProvider>

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
      </div>

      {/* CTA */}
      <motion.div className="w-full mt-6" variants={childVariants}>
        <OnboardingButton active={valid} disabled={!valid || buttonLoading} onClick={handleConfirm}>
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

      <div className="pt-16" />
    </motion.div>
    </div>
  );
}
