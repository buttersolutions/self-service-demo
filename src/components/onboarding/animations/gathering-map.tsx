'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, MapMarker, MarkerContent } from '@/components/ui/map';
import { Star } from 'lucide-react';
import { CountUp } from '../ui/count-up';
import type { LocationItem } from '../types';
import MapLibreGL from 'maplibre-gl';

interface GatheringMapProps {
  locations: LocationItem[];
  isActive: boolean;
  onAllPinsRevealed?: () => void;
}

// Light, desaturated CARTO Voyager style with whiter tones
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const MAP_STYLES = { light: MAP_STYLE, dark: MAP_STYLE };

export function GatheringMap({ locations, isActive, onAllPinsRevealed }: GatheringMapProps) {
  const mapRef = useRef<MapLibreGL.Map>(null);
  const displayLocations = useMemo(() => locations.slice(0, 20), [locations]);
  const [visiblePins, setVisiblePins] = useState<Set<number>>(new Set());
  const [cameraReady, setCameraReady] = useState(false);
  const prevLocationCountRef = useRef(displayLocations.length);
  const revealedRef = useRef(false);

  // Reset camera when new locations arrive (e.g., chain discovery resolves)
  useEffect(() => {
    if (displayLocations.length > prevLocationCountRef.current) {
      setCameraReady(false);
      setVisiblePins(new Set());
      revealedRef.current = false;
    }
    prevLocationCountRef.current = displayLocations.length;
  }, [displayLocations.length]);

  const initialCenter = useMemo<[number, number]>(() => {
    if (displayLocations.length === 0) return [0, 20];
    const avgLng = displayLocations.reduce((s, l) => s + l.lng, 0) / displayLocations.length;
    const avgLat = displayLocations.reduce((s, l) => s + l.lat, 0) / displayLocations.length;
    return [avgLng, avgLat];
  }, [displayLocations]);

  // Camera animation + staggered pin reveal
  useEffect(() => {
    if (!isActive) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    let observer: ResizeObserver | null = null;
    let destroyed = false;

    const poll = setInterval(() => {
      const map = mapRef.current;
      if (!map || destroyed) return;

      try {
        map.getCenter();
      } catch {
        return;
      }

      clearInterval(poll);

      const container = map.getContainer();
      observer = new ResizeObserver(() => map.resize());
      observer.observe(container);

      timers.push(setTimeout(() => { if (!destroyed) map.resize(); }, 100));

      // Restyle map — white-purple tint
      timers.push(setTimeout(() => {
        if (destroyed) return;
        try {
          const style = map.getStyle();
          if (style?.layers) {
            for (const layer of style.layers) {
              // Water — light lavender
              if (layer.id.includes('water') && layer.type === 'fill') {
                map.setPaintProperty(layer.id, 'fill-color', '#eeedf8');
              }
              // Background — faint purple-white
              if (layer.id === 'background' && layer.type === 'background') {
                map.setPaintProperty(layer.id, 'background-color', '#f8f7fc');
              }
              // Land/earth — very light purple-white
              if ((layer.id.includes('land') || layer.id.includes('earth')) && layer.type === 'fill') {
                map.setPaintProperty(layer.id, 'fill-color', '#f8f7fc');
              }
              // Roads — subtle purple tint
              if (layer.id.includes('road') && layer.type === 'line') {
                map.setPaintProperty(layer.id, 'line-opacity', 0.35);
                map.setPaintProperty(layer.id, 'line-color', '#d5d2ec');
              }
              // Buildings
              if (layer.id.includes('building') && layer.type === 'fill') {
                map.setPaintProperty(layer.id, 'fill-color', '#eae8f4');
              }
              // Soften labels
              if (layer.type === 'symbol') {
                map.setPaintProperty(layer.id, 'text-opacity', 0.45);
                map.setPaintProperty(layer.id, 'text-color', '#8b85b8');
              }
            }
          }
        } catch {
          // Ignore style errors
        }
      }, 300));

      const locs = displayLocations;

      if (locs.length === 1) {
        timers.push(
          setTimeout(() => {
            if (destroyed) return;
            map.resize();
            map.flyTo({
              center: [locs[0].lng, locs[0].lat],
              zoom: 14,
              duration: 1400,
              essential: true,
            });
          }, 400),
        );
      } else if (locs.length > 1) {
        const bounds = new MapLibreGL.LngLatBounds();
        locs.forEach((loc) => bounds.extend([loc.lng, loc.lat]));

        timers.push(
          setTimeout(() => {
            if (destroyed) return;
            map.resize();
            map.fitBounds(bounds, {
              padding: { top: 80, bottom: 80, left: 300, right: 60 },
              duration: 1500,
              maxZoom: 14,
              essential: true,
            });
          }, 400),
        );
      }

      // Mark camera as ready after animation completes
      const cameraSettleMs = locs.length === 1 ? 1900 : 2000;
      timers.push(
        setTimeout(() => {
          if (!destroyed) setCameraReady(true);
        }, cameraSettleMs),
      );
    }, 150);

    return () => {
      destroyed = true;
      clearInterval(poll);
      timers.forEach(clearTimeout);
      observer?.disconnect();
    };
  }, [isActive, displayLocations]);

  // Stagger pin reveal after camera settles
  useEffect(() => {
    if (!cameraReady) return;

    const staggerMs = Math.max(800, Math.min(1500, 10000 / Math.max(displayLocations.length, 1)));
    const timers: ReturnType<typeof setTimeout>[] = [];

    displayLocations.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setVisiblePins((prev) => new Set([...prev, i]));
        }, i * staggerMs),
      );
    });

    const lastPinAt = Math.max(0, displayLocations.length - 1) * staggerMs + 400;
    timers.push(
      setTimeout(() => {
        if (revealedRef.current) return;
        revealedRef.current = true;
        onAllPinsRevealed?.();
      }, lastPinAt),
    );

    return () => timers.forEach(clearTimeout);
  }, [cameraReady, displayLocations, onAllPinsRevealed]);

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div className="w-full h-full" style={{ pointerEvents: 'none' }}>
        <Map
          ref={mapRef}
          center={initialCenter}
          zoom={3}
          styles={MAP_STYLES}
          className="w-full h-full"
          interactive={false}
        >
          {cameraReady &&
            displayLocations.map((loc, i) =>
              visiblePins.has(i) ? (
                <MapMarker
                  key={loc.id}
                  longitude={loc.lng}
                  latitude={loc.lat}
                  anchor="bottom"
                >
                  <MarkerContent>
                    <motion.div
                      className="flex flex-col items-center"
                      initial={{ opacity: 0, y: -12, scale: 0.5 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 20,
                        mass: 0.8,
                      }}
                    >
                      {/* Info card */}
                      <motion.div
                        className="bg-white rounded-lg px-2.5 py-1.5 mb-1 shadow-lg border border-gray-100 max-w-[180px]"
                        initial={{ opacity: 0, y: 4, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.3 }}
                      >
                        <div className="text-[11px] font-semibold text-gray-900 truncate leading-tight">
                          {loc.name.split(' - ').pop()?.trim() ?? loc.name}
                        </div>
                        <div className="text-[9px] text-gray-400 truncate leading-tight mt-0.5">
                          {loc.address.split(',').slice(0, 2).join(',')}
                        </div>
                        {(loc.rating != null || (loc.userRatingCount ?? 0) > 0) && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {loc.rating != null && (
                              <div className="flex items-center gap-0.5">
                                <Star className="size-2.5 fill-amber-400 text-amber-400" />
                                <span className="text-[10px] font-medium text-gray-700">{loc.rating.toFixed(1)}</span>
                              </div>
                            )}
                            {(loc.userRatingCount ?? 0) > 0 && (
                              <span className="text-[9px] text-gray-400">
                                ({loc.userRatingCount} reviews)
                              </span>
                            )}
                          </div>
                        )}
                      </motion.div>
                      {/* Pin */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={i === 0 ? 36 : 26}
                        height={i === 0 ? 36 : 26}
                        viewBox="0 0 24 24"
                        fill={i === 0 ? '#625CE4' : '#6b7280'}
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
                      >
                        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                        <circle cx="12" cy="10" r="3" fill="white" />
                      </svg>
                    </motion.div>
                  </MarkerContent>
                </MapMarker>
              ) : null,
            )}
        </Map>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={isActive ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 2.2 }}
        className="absolute bottom-4 right-4 z-10"
      >
        <div className="bg-white rounded-xl px-4 py-2.5 shadow-md border border-gray-100">
          <div className="text-xs text-gray-500">Locations found</div>
          <div className="text-lg font-semibold text-gray-900">
            <CountUp to={locations.length} duration={1.5} delay={2.4} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
