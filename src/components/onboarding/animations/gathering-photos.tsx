'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlacePhoto } from '@/lib/types';

interface GatheringPhotosProps {
  photos: PlacePhoto[];
  logoUrl: string | null;
  brandColors: string[];
  businessName: string;
  isActive: boolean;
  onAllPhotosShown?: () => void;
  onComplete?: () => void;
}

type PhotoLayout = { x: number; y: number; w: number; h: number; rotate: number; z: number };

const PHOTO_LAYOUT: PhotoLayout[] = [
  { x: 0, y: -25, w: 320, h: 230, rotate: -1, z: 16 },
  { x: -290, y: -110, w: 250, h: 180, rotate: -3.5, z: 12 },
  { x: 300, y: -90, w: 255, h: 175, rotate: 2.5, z: 13 },
  { x: -230, y: 110, w: 235, h: 170, rotate: 2, z: 11 },
  { x: 250, y: 120, w: 240, h: 170, rotate: -2.5, z: 10 },
  { x: -75, y: -220, w: 220, h: 155, rotate: 1.5, z: 9 },
  { x: 100, y: 220, w: 215, h: 150, rotate: -1, z: 8 },
  { x: -460, y: 15, w: 210, h: 150, rotate: -5, z: 7 },
  { x: 475, y: 25, w: 205, h: 145, rotate: 4.5, z: 6 },
  { x: -410, y: -200, w: 190, h: 135, rotate: -4, z: 5 },
  { x: 425, y: -185, w: 195, h: 135, rotate: 3, z: 4 },
  { x: -390, y: 200, w: 185, h: 130, rotate: 3.5, z: 3 },
  { x: 400, y: 210, w: 190, h: 130, rotate: -3, z: 2 },
  { x: 0, y: -300, w: 175, h: 125, rotate: 2, z: 1 },
  { x: -550, y: -110, w: 170, h: 120, rotate: -6, z: 0 },
  { x: 565, y: -90, w: 170, h: 120, rotate: 5, z: 0 },
];

function PhotoCard({ photo, layout }: { photo: PlacePhoto; layout: PhotoLayout }) {
  const [loaded, setLoaded] = useState(false);
  const handleLoad = useCallback(() => setLoaded(true), []);

  return (
    <motion.div
      className="absolute rounded-xl overflow-hidden"
      style={{
        width: layout.w,
        height: layout.h,
        left: '50%',
        top: '50%',
        marginLeft: -layout.w / 2,
        marginTop: -layout.h / 2,
        zIndex: layout.z,
        boxShadow: loaded
          ? '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)'
          : 'none',
        border: loaded ? '3px solid white' : '3px solid transparent',
      }}
      initial={{ opacity: 0, y: 40, rotate: 0, x: 0, scale: 0.5 }}
      animate={{
        opacity: loaded ? 1 : 0,
        y: loaded ? layout.y : 40,
        x: loaded ? layout.x : 0,
        rotate: loaded ? layout.rotate : 0,
        scale: loaded ? 1 : 0.5,
      }}
      transition={{
        type: 'spring',
        stiffness: 220,
        damping: 20,
        mass: 0.7,
      }}
    >
      <img
        src={`/api/places/photo?name=${encodeURIComponent(photo.name)}&maxWidthPx=400`}
        alt=""
        className="w-full h-full object-cover"
        draggable={false}
        onLoad={handleLoad}
      />
    </motion.div>
  );
}

export function GatheringPhotos({
  photos,
  logoUrl,
  brandColors,
  businessName,
  isActive,
  onAllPhotosShown,
  onComplete,
}: GatheringPhotosProps) {
  const [visiblePhotos, setVisiblePhotos] = useState(0);
  const displayPhotos = photos.slice(0, 16);
  const calledRef = useRef(false);
  const completeCalledRef = useRef(false);

  useEffect(() => {
    if (!isActive || displayPhotos.length === 0) return;
    setVisiblePhotos(0);
    calledRef.current = false;
    completeCalledRef.current = false;

    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      setVisiblePhotos(count);
      if (count >= displayPhotos.length) {
        clearInterval(interval);
        if (!calledRef.current) {
          calledRef.current = true;
          onAllPhotosShown?.();
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isActive, displayPhotos.length, onAllPhotosShown]);

  // Fire onComplete 1.5 seconds after all photos are shown
  useEffect(() => {
    if (visiblePhotos < displayPhotos.length || displayPhotos.length === 0) return;
    if (completeCalledRef.current) return;

    const timer = setTimeout(() => {
      if (!completeCalledRef.current) {
        completeCalledRef.current = true;
        onComplete?.();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [visiblePhotos, displayPhotos.length, onComplete]);

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <div className="relative" style={{ width: 1100, height: 650 }}>
        <AnimatePresence>
          {displayPhotos.map((photo, i) => {
            if (i >= visiblePhotos) return null;
            const layout = PHOTO_LAYOUT[i % PHOTO_LAYOUT.length];
            return (
              <PhotoCard key={photo.name} photo={photo} layout={layout} />
            );
          })}
        </AnimatePresence>

        {/* Brand logo */}
        {visiblePhotos > 0 && logoUrl && (
          <motion.div
            className="absolute rounded-xl overflow-hidden"
            style={{
              width: 200,
              height: 140,
              left: '50%',
              top: '50%',
              marginLeft: -100,
              marginTop: -70,
              zIndex: 20,
              boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
              border: '3px solid white',
              background: brandColors[0] || '#f9fafb',
            }}
            initial={{ opacity: 0, y: 40, x: -180, scale: 0.5 }}
            animate={{ opacity: 1, y: -160, x: -180, scale: 1, rotate: -3 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20, mass: 0.7, delay: 0.2 }}
          >
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                src={logoUrl}
                alt={businessName}
                className="max-h-full max-w-full object-contain"
                draggable={false}
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
