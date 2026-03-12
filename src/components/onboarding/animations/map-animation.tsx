"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Map } from "@/components/ui/map";
import { CountUp } from "@/components/ui/count-up";
import type { BusinessLocation } from "@/lib/mock-data";
import MapLibreGL from "maplibre-gl";

interface MapAnimationProps {
  locations: BusinessLocation[];
  isActive: boolean;
}

function computeTarget(locations: BusinessLocation[]) {
  // Always zoom to the main/primary location
  const main = locations.find((l) => l.isMain) ?? locations[0];
  return { center: [main.lng, main.lat] as [number, number], zoom: 14 };
}

function createPinElement(isMain: boolean): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.opacity = "0";
  wrapper.style.transform = "translateY(-12px) scale(0.5)";
  wrapper.style.transition = "opacity 0.5s ease, transform 0.5s ease";

  const size = isMain ? 32 : 24;
  const color = isMain ? "#625CE4" : "#6b7280";

  wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2))"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`;

  return wrapper;
}

export function MapAnimation({ locations, isActive }: MapAnimationProps) {
  const target = useMemo(() => computeTarget(locations), [locations]);
  const mapRef = useRef<MapLibreGL.Map>(null);

  // Stable refs so the effect closure always reads fresh values
  const locationsRef = useRef(locations);
  locationsRef.current = locations;
  const targetRef = useRef(target);
  targetRef.current = target;

  // Run once on mount. All timers tracked for cleanup.
  useEffect(() => {
    const allTimers: ReturnType<typeof setTimeout>[] = [];
    const markers: MapLibreGL.Marker[] = [];
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

      // Resize observer
      const container = map.getContainer();
      observer = new ResizeObserver(() => map.resize());
      observer.observe(container);
      map.resize();

      const t = targetRef.current;
      const locs = locationsRef.current;

      // FlyTo
      allTimers.push(
        setTimeout(() => {
          if (destroyed) return;
          map.resize();
          allTimers.push(
            setTimeout(() => {
              if (destroyed) return;
              map.flyTo({
                center: t.center,
                zoom: t.zoom,
                duration: 2500,
                essential: true,
              });
            }, 300)
          );
        }, 100)
      );

      // Native markers with staggered reveal
      locs.forEach((loc, i) => {
        const el = createPinElement(loc.isMain);
        const marker = new MapLibreGL.Marker({ element: el, anchor: "bottom" })
          .setLngLat([loc.lng, loc.lat])
          .addTo(map);
        markers.push(marker);

        allTimers.push(
          setTimeout(() => {
            if (destroyed) return;
            el.style.opacity = "1";
            el.style.transform = "translateY(0) scale(1)";
          }, 2500 + i * 500)
        );
      });
    }, 100);

    return () => {
      destroyed = true;
      clearInterval(poll);
      allTimers.forEach(clearTimeout);
      markers.forEach((m) => m.remove());
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden font-sans">
      <div className="w-full h-full" style={{ pointerEvents: "none" }}>
        <Map
          ref={mapRef}
          center={target.center}
          zoom={3}
          theme="light"
          className="w-full h-full"
          interactive={false}
        />
      </div>

      {/* Scanning pulse overlay */}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <motion.div
            className="rounded-full border-2 border-primary/20"
            initial={{ width: 0, height: 0, opacity: 0.5 }}
            animate={{ width: [0, 300, 500], height: [0, 300, 500], opacity: [0.4, 0.1, 0] }}
            transition={{ duration: 2.5, repeat: 2, ease: "easeOut" }}
          />
        </div>
      )}

      {/* Location counter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={isActive ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 3.5 }}
        className="absolute bottom-6 right-6 z-10"
      >
        <Card className="px-4 py-2.5 shadow-md">
          <div className="text-xs text-muted-foreground">Locations found</div>
          <div className="text-lg font-semibold text-foreground">
            <CountUp to={locations.length} duration={1} delay={3.6} />
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
