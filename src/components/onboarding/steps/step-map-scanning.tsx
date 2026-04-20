'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GatheringMap } from '../animations/gathering-map';
import { TypewriterSearch } from '../ui/typewriter-search';
import { useOnboarding } from '@/lib/demo-flow-context';

const MIN_DURATION_MS = 2500;
const PIN_HOLD_MS = 1000;
const MAX_DURATION_MS = 8000;

interface StepMapScanningProps {
  onComplete: () => void;
}

export function StepMapScanning({ onComplete }: StepMapScanningProps) {
  const { state } = useOnboarding();
  const { locations, business } = state;
  const [minElapsed, setMinElapsed] = useState(false);
  const [maxElapsed, setMaxElapsed] = useState(false);
  const [pinsRevealed, setPinsRevealed] = useState(false);
  const [pinHoldElapsed, setPinHoldElapsed] = useState(false);
  const completedRef = useRef(false);

  const businessName = business?.name ?? '';

  const handleAllPinsRevealed = useCallback(() => setPinsRevealed(true), []);

  useEffect(() => {
    const min = setTimeout(() => setMinElapsed(true), MIN_DURATION_MS);
    const max = setTimeout(() => setMaxElapsed(true), MAX_DURATION_MS);
    return () => {
      clearTimeout(min);
      clearTimeout(max);
    };
  }, []);

  // Hold on the map for PIN_HOLD_MS after the final pin reveals so the user
  // can see the completed state before we advance.
  useEffect(() => {
    if (!pinsRevealed) return;
    const t = setTimeout(() => setPinHoldElapsed(true), PIN_HOLD_MS);
    return () => clearTimeout(t);
  }, [pinsRevealed]);

  useEffect(() => {
    if (completedRef.current) return;
    // Advance as soon as the first pins have been revealed, a short hold has
    // elapsed, and the minimum display duration is up. Chain discovery, brand
    // and screenshot fetches continue in the background — downstream steps
    // handle their own loading.
    const ready = (minElapsed && pinsRevealed && pinHoldElapsed) || maxElapsed;
    if (!ready) return;
    completedRef.current = true;
    onComplete();
  }, [minElapsed, pinsRevealed, pinHoldElapsed, maxElapsed, onComplete]);

  return (
    <motion.div
      className="relative w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Search bar */}
      <div className="absolute top-4 z-30 w-full max-w-md px-6 left-1/2 -translate-x-1/2">
        <TypewriterSearch text={`Finding ${businessName} locations...`} />
      </div>

      {/* Map */}
      <div className="w-full h-full">
        <GatheringMap locations={locations} isActive onAllPinsRevealed={handleAllPinsRevealed} />
      </div>

      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] z-20 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(98, 92, 228, 0.5) 30%, rgba(98, 92, 228, 0.8) 50%, rgba(98, 92, 228, 0.5) 70%, transparent 100%)',
          boxShadow: '0 0 20px 4px rgba(98, 92, 228, 0.15)',
        }}
        initial={{ top: 0, opacity: 0 }}
        animate={{ top: '100%', opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  );
}
