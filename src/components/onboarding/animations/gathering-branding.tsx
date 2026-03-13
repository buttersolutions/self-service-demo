'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlacePhoto } from '@/lib/types';

interface GatheringBrandingProps {
  brandColors: string[];
  businessName: string;
  logoUrl: string | null;
  photos: PlacePhoto[];
  isActive: boolean;
}

// Scattered collage positions for up to 16 photos — covers the full viewport
const PHOTO_LAYOUT: { x: number; y: number; w: number; h: number; rotate: number; z: number }[] = [
  // Center hero
  { x: 0, y: -20, w: 250, h: 180, rotate: -1, z: 16 },
  // Inner ring
  { x: -230, y: -90, w: 190, h: 140, rotate: -3.5, z: 12 },
  { x: 240, y: -70, w: 195, h: 135, rotate: 2.5, z: 13 },
  { x: -180, y: 90, w: 180, h: 130, rotate: 2, z: 11 },
  { x: 200, y: 100, w: 185, h: 130, rotate: -2.5, z: 10 },
  // Mid ring
  { x: -60, y: -175, w: 170, h: 120, rotate: 1.5, z: 9 },
  { x: 80, y: 175, w: 165, h: 115, rotate: -1, z: 8 },
  { x: -370, y: 10, w: 160, h: 115, rotate: -5, z: 7 },
  { x: 380, y: 20, w: 155, h: 110, rotate: 4.5, z: 6 },
  // Outer ring
  { x: -330, y: -160, w: 145, h: 105, rotate: -4, z: 5 },
  { x: 340, y: -145, w: 150, h: 105, rotate: 3, z: 4 },
  { x: -310, y: 160, w: 140, h: 100, rotate: 3.5, z: 3 },
  { x: 320, y: 170, w: 145, h: 100, rotate: -3, z: 2 },
  // Far edges
  { x: 0, y: -240, w: 135, h: 95, rotate: 2, z: 1 },
  { x: -450, y: -90, w: 130, h: 95, rotate: -6, z: 0 },
  { x: 460, y: -70, w: 130, h: 95, rotate: 5, z: 0 },
];

export function GatheringBranding({
  brandColors,
  businessName,
  logoUrl,
  photos,
  isActive,
}: GatheringBrandingProps) {
  const primaryColor = brandColors.find((c) => c !== '#FFFFFF') ?? '#625CE4';
  const colors = brandColors.filter((c) => c !== '#FFFFFF');
  if (colors.length === 0) {
    colors.push('#625CE4', '#7C78EE', '#9B97F5');
  }

  const hasPhotos = photos.length > 0;
  const displayPhotos = photos.slice(0, 16);
  const [visibleCount, setVisibleCount] = useState(0);

  // Stagger photo reveal
  useEffect(() => {
    if (!isActive || !hasPhotos) return;
    setVisibleCount(0);

    const max = displayPhotos.length;
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= max) clearInterval(interval);
    }, 180);

    return () => clearInterval(interval);
  }, [isActive, hasPhotos, displayPhotos.length]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, #999 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Color blob */}
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full blur-[200px] opacity-[0.06]"
        style={{ backgroundColor: primaryColor }}
        initial={{ scale: 0 }}
        animate={isActive ? { scale: 1 } : {}}
        transition={{ delay: 0.3, duration: 2 }}
      />

      {hasPhotos ? (
        <>
          {/* Photo collage — fills the viewport */}
          <div className="relative z-10 flex items-center justify-center w-full" style={{ height: 440 }}>
            <AnimatePresence>
              {displayPhotos.map((photo, i) => {
                if (i >= visibleCount) return null;
                const layout = PHOTO_LAYOUT[i % PHOTO_LAYOUT.length];
                return (
                  <motion.div
                    key={photo.name}
                    className="absolute rounded-xl overflow-hidden"
                    style={{
                      width: layout.w,
                      height: layout.h,
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
          </div>

          {/* Logo + brand colors */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isActive ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 2.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-20 flex items-center gap-2.5 mt-2"
          >
            {logoUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={isActive ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 2.7, type: 'spring', stiffness: 300, damping: 20 }}
                className="bg-white rounded-xl shadow-sm px-3 py-2 border border-gray-100"
              >
                <img src={logoUrl} alt="" className="h-7 w-auto object-contain" draggable={false} />
              </motion.div>
            )}
            {colors.slice(0, 4).map((color, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={isActive ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 2.7 + i * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                className="bg-white rounded-xl shadow-sm px-2.5 py-1.5 flex items-center gap-2 border border-gray-100"
              >
                <div className="size-6 rounded-md" style={{ backgroundColor: color }} />
                <span className="text-[11px] font-mono text-gray-400">{color.toUpperCase()}</span>
              </motion.div>
            ))}
          </motion.div>
        </>
      ) : (
        <>
          {/* Fallback: color cards when no photos */}
          <div className="relative z-10 flex items-center justify-center" style={{ width: 500, height: 300 }}>
            {[
              ...colors.slice(0, 4),
              ...(colors.length < 4 ? colors.slice(0, 4 - colors.length) : []),
            ]
              .slice(0, 4)
              .map((color, i) => {
                const transforms = [
                  { rotate: -8, x: -140, y: 8 },
                  { rotate: -3, x: -50, y: -20 },
                  { rotate: 2, x: 40, y: 6 },
                  { rotate: 6, x: 130, y: -14 },
                ];
                const t = transforms[i];
                return (
                  <motion.div
                    key={i}
                    className="absolute rounded-2xl overflow-hidden border-2 border-white/80"
                    style={{
                      width: 210,
                      height: 260,
                      backgroundColor: color,
                      zIndex: i,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                    }}
                    initial={{ opacity: 0, y: 80, rotate: 0, x: 0, scale: 0.7 }}
                    animate={
                      isActive
                        ? { opacity: 1, y: t.y, x: t.x, rotate: t.rotate, scale: 1 }
                        : {}
                    }
                    transition={{
                      delay: 0.3 + i * 0.18,
                      type: 'spring',
                      stiffness: 200,
                      damping: 18,
                      mass: 0.8,
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt=""
                          className="w-20 h-20 object-contain opacity-30 mix-blend-luminosity"
                          draggable={false}
                        />
                      ) : (
                        <span className="text-5xl font-bold text-white/30 select-none">
                          {businessName.charAt(0)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isActive ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1.8, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex items-center gap-3 mt-6"
          >
            {colors.slice(0, 4).map((color, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={isActive ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 2.0 + i * 0.12, type: 'spring', stiffness: 300, damping: 20 }}
                className="bg-white rounded-xl shadow-sm px-3 py-2 flex items-center gap-2.5 border border-gray-100"
              >
                <div className="size-8 rounded-lg" style={{ backgroundColor: color }} />
                <span className="text-xs font-mono text-gray-500">{color.toUpperCase()}</span>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}
