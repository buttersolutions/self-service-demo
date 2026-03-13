'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlacePhoto } from '@/lib/types';

interface GatheringPhotosProps {
  photos: PlacePhoto[];
  logoUrl: string | null;
  brandColors: string[];
  businessName: string;
  isActive: boolean;
}

const PHOTO_LAYOUT: { x: number; y: number; w: number; h: number; rotate: number; z: number }[] = [
  { x: 0, y: -20, w: 250, h: 180, rotate: -1, z: 16 },
  { x: -230, y: -90, w: 190, h: 140, rotate: -3.5, z: 12 },
  { x: 240, y: -70, w: 195, h: 135, rotate: 2.5, z: 13 },
  { x: -180, y: 90, w: 180, h: 130, rotate: 2, z: 11 },
  { x: 200, y: 100, w: 185, h: 130, rotate: -2.5, z: 10 },
  { x: -60, y: -175, w: 170, h: 120, rotate: 1.5, z: 9 },
  { x: 80, y: 175, w: 165, h: 115, rotate: -1, z: 8 },
  { x: -370, y: 10, w: 160, h: 115, rotate: -5, z: 7 },
  { x: 380, y: 20, w: 155, h: 110, rotate: 4.5, z: 6 },
  { x: -330, y: -160, w: 145, h: 105, rotate: -4, z: 5 },
  { x: 340, y: -145, w: 150, h: 105, rotate: 3, z: 4 },
  { x: -310, y: 160, w: 140, h: 100, rotate: 3.5, z: 3 },
  { x: 320, y: 170, w: 145, h: 100, rotate: -3, z: 2 },
  { x: 0, y: -240, w: 135, h: 95, rotate: 2, z: 1 },
  { x: -450, y: -90, w: 130, h: 95, rotate: -6, z: 0 },
  { x: 460, y: -70, w: 130, h: 95, rotate: 5, z: 0 },
];

export function GatheringPhotos({
  photos,
  logoUrl,
  brandColors,
  businessName,
  isActive,
}: GatheringPhotosProps) {
  const [visiblePhotos, setVisiblePhotos] = useState(0);
  const displayPhotos = photos.slice(0, 16);

  useEffect(() => {
    if (!isActive || displayPhotos.length === 0) return;
    setVisiblePhotos(0);

    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisiblePhotos(count);
      if (count >= displayPhotos.length) clearInterval(interval);
    }, 180);

    return () => clearInterval(interval);
  }, [isActive, displayPhotos.length]);

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <div className="relative" style={{ width: 900, height: 500 }}>
        <AnimatePresence>
          {displayPhotos.map((photo, i) => {
            if (i >= visiblePhotos) return null;
            const layout = PHOTO_LAYOUT[i % PHOTO_LAYOUT.length];
            return (
              <motion.div
                key={photo.name}
                className="absolute rounded-xl overflow-hidden"
                style={{
                  width: layout.w,
                  height: layout.h,
                  left: '50%',
                  top: '50%',
                  marginLeft: -layout.w / 2,
                  marginTop: -layout.h / 2,
                  zIndex: layout.z,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                  border: '3px solid white',
                }}
                initial={{ opacity: 0, y: 40, rotate: 0, x: 0, scale: 0.5 }}
                animate={{
                  opacity: 1,
                  y: layout.y,
                  x: layout.x,
                  rotate: layout.rotate,
                  scale: 1,
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
                />
              </motion.div>
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
