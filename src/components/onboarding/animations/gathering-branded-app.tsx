'use client';

import { motion } from 'framer-motion';
import { deriveBrandPalette } from '@/lib/colors';
import { OnboardingButton } from '../ui';
import type { LocationItem } from '../types';

interface GatheringBrandedAppProps {
  businessName: string;
  logoUrl: string | null;
  brandColors: string[];
  locations: LocationItem[];
  isActive: boolean;
}

export function GatheringBrandedApp({
  businessName,
  brandColors,
  isActive,
}: GatheringBrandedAppProps) {
  const palette = deriveBrandPalette(brandColors);
  const primaryColor = palette.primary;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6">
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 16 }}
        animate={isActive ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <h3 className="text-2xl font-semibold text-gray-900 font-serif mb-2">
          Your branded app is ready
        </h3>
        <p className="text-sm text-gray-400">
          {businessName} — powered by Allgravy
        </p>
      </motion.div>

      {/* iPhone mockup — empty */}
      <motion.div
        className="relative mb-10"
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={isActive ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="relative w-[260px] h-[520px] rounded-[40px] border-[6px] overflow-hidden"
          style={{
            borderColor: '#e2e3e5',
            backgroundColor: '#f0f1f3',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',
          }}
        >
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 rounded-b-2xl z-10" style={{ backgroundColor: '#e2e3e5' }} />

          {/* Empty screen — clean white */}
          <div
            className="w-full h-full"
            style={{ background: 'linear-gradient(180deg, #fafafa 0%, #f4f4f5 100%)' }}
          />

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 rounded-full" style={{ backgroundColor: '#d4d5d8' }} />
        </div>
      </motion.div>

      {/* CTA button */}
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={isActive ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 1, duration: 0.4 }}
      >
        <OnboardingButton active>
          Get in
        </OnboardingButton>
      </motion.div>
    </div>
  );
}
