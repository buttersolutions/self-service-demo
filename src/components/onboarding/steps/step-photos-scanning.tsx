'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TypewriterSearch } from '../ui/typewriter-search';
import { GatheringPhotos } from '../animations/gathering-photos';
import { useOnboarding } from '@/lib/demo-flow-context';

// Safety: if photos never fully load or onComplete never fires, advance anyway.
const MAX_DURATION_MS = 9000;

interface StepPhotosScanningProps {
  onComplete: () => void;
}

export function StepPhotosScanning({ onComplete }: StepPhotosScanningProps) {
  const { state } = useOnboarding();
  const { business, gatheringData } = state;
  const completedRef = useRef(false);

  const fire = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  useEffect(() => {
    const t = setTimeout(fire, MAX_DURATION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="relative w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="absolute top-4 z-30 w-full max-w-md px-6 left-1/2 -translate-x-1/2">
        <TypewriterSearch text={`Analysing ${business?.name ?? 'business'} images...`} />
      </div>

      <GatheringPhotos
        photos={gatheringData.photos}
        logoUrl={business?.logoUrl ?? null}
        businessName={business?.name ?? ''}
        isActive
        onComplete={fire}
      />
    </motion.div>
  );
}
