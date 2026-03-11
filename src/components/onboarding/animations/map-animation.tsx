"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Map, MapMarker, useMap } from "@/components/ui/map";
import { CountUp } from "@/components/ui/count-up";
import type { BusinessLocation } from "@/lib/mock-data";

interface MapAnimationProps {
  locations: BusinessLocation[];
  isActive: boolean;
  businessName?: string;
}

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay * 1000);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <span>
      {displayed}
      {started && displayed.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-[2px] h-4 bg-foreground ml-px align-middle"
        />
      )}
    </span>
  );
}

function FlyToAnimation({ locations, isActive }: { locations: BusinessLocation[]; isActive: boolean }) {
  const { map, isLoaded } = useMap();
  const hasFlown = useRef(false);

  useEffect(() => {
    if (!map || !isLoaded || !isActive || hasFlown.current) return;
    hasFlown.current = true;

    const centerLat = locations.reduce((sum, l) => sum + l.lat, 0) / locations.length;
    const centerLng = locations.reduce((sum, l) => sum + l.lng, 0) / locations.length;
    const latSpread = Math.max(...locations.map((l) => l.lat)) - Math.min(...locations.map((l) => l.lat));
    const lngSpread = Math.max(...locations.map((l) => l.lng)) - Math.min(...locations.map((l) => l.lng));
    const spread = Math.max(latSpread, lngSpread);
    const targetZoom = spread > 1 ? 9 : spread > 0.3 ? 11 : spread > 0.05 ? 13 : 14;

    setTimeout(() => {
      map.flyTo({
        center: [centerLng, centerLat],
        zoom: targetZoom,
        duration: 3000,
        essential: true,
      });
    }, 500);
  }, [map, isLoaded, isActive, locations]);

  return null;
}

function DelayedPin({ location, delay, isActive }: { location: BusinessLocation; delay: number; isActive: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [isActive, delay]);

  return (
    <div
      className="flex flex-col items-center transition-all duration-300"
      style={{ opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(-16px)" }}
    >
      <MapPin
        className={
          location.isMain
            ? "w-8 h-8 text-[#625CE4] drop-shadow-md"
            : "w-6 h-6 text-gray-500 drop-shadow-sm"
        }
        fill="currentColor"
        strokeWidth={1.5}
      />
    </div>
  );
}

export function MapAnimation({ locations, isActive, businessName }: MapAnimationProps) {
  const centerLat = locations.reduce((sum, l) => sum + l.lat, 0) / locations.length;
  const centerLng = locations.reduce((sum, l) => sum + l.lng, 0) / locations.length;

  const mainLocation = locations.find((l) => l.isMain) ?? locations[0];
  const searchText = `${mainLocation.name} in ${mainLocation.address.split(",").slice(-2).join(",").trim()}`;

  return (
    <div className="w-full h-full relative overflow-hidden font-sans">
      {/* Google-style search bar — centered in visible area past sidebar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={isActive ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="absolute top-5 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-6"
      >
        <Card className="px-4 py-2.5 shadow-lg">
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-foreground truncate">
              <TypewriterText text={searchText} delay={0.8} />
            </span>
          </div>
        </Card>
      </motion.div>

      {/* Non-interactive map */}
      <div className="w-full h-full" style={{ pointerEvents: "none" }}>
        <Map
          center={[centerLng, centerLat]}
          zoom={3}
          theme="light"
          className="w-full h-full"
          interactive={false}
        >
          <FlyToAnimation locations={locations} isActive={isActive} />

          {locations.map((location, i) => (
            <MapMarker
              key={location.id}
              longitude={location.lng}
              latitude={location.lat}
              anchor="bottom"
            >
              <DelayedPin location={location} delay={2500 + i * 500} isActive={isActive} />
            </MapMarker>
          ))}
        </Map>
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
