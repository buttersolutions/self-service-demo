'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { TypewriterSearch } from '../ui/typewriter-search';
import { GatheringSidebar, type SidebarStep } from '../animations/gathering-sidebar';
import { GatheringMap } from '../animations/gathering-map';
import { GatheringReviews } from '../animations/gathering-reviews';
import { GatheringPhotos } from '../animations/gathering-photos';
import { GatheringReport } from '../animations/gathering-report';
import { GatheringBrandedApp } from '../animations/gathering-branded-app';
import type { LocationItem, GatheringData } from '../types';
import type { BusinessData } from './step-confirm-business';

type PhaseId = 'locations' | 'reviews' | 'photos' | 'report' | 'branded-app';

interface PhaseConfig {
  id: PhaseId;
  searchText: (name: string) => string;
  minDurationMs: number;
  maxDurationMs: number;
  dataReady: (data: GatheringData) => boolean;
}

const PHASES: PhaseConfig[] = [
  {
    id: 'locations',
    searchText: (name) => `Finding ${name} locations on map...`,
    minDurationMs: 7000,
    maxDurationMs: 10000,
    dataReady: () => true,
  },
  {
    id: 'reviews',
    searchText: (name) => `Reading ${name} customer reviews...`,
    minDurationMs: 12000,
    maxDurationMs: 25000,
    dataReady: (data) => data.reviews !== null,
  },
  {
    id: 'photos',
    searchText: (name) => `Collecting ${name} photos...`,
    minDurationMs: 4000,
    maxDurationMs: 6000,
    dataReady: (data) => data.photos.length > 0,
  },
  {
    id: 'report',
    searchText: () => '',
    minDurationMs: Infinity,
    maxDurationMs: Infinity,
    dataReady: () => false, // Never auto-advance — controlled by GatheringReport's onComplete
  },
  {
    id: 'branded-app',
    searchText: () => '',
    minDurationMs: Infinity,
    maxDurationMs: Infinity,
    dataReady: () => false,
  },
];

const SIDEBAR_STEPS: SidebarStep[] = [
  { id: 'locations', label: 'Mapping locations', description: 'Plotting your locations on the map' },
  { id: 'reviews', label: 'Analyzing reviews', description: 'Reading what customers say' },
  { id: 'photos', label: 'Collecting photos', description: 'Gathering business imagery' },
  { id: 'report', label: 'Business intelligence', description: 'Company intel & insights' },
  { id: 'branded-app', label: 'Your branded app', description: 'Personalizing your experience' },
];

// Step transition variants — dramatic slide + scale + fade + blur
const phaseVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    scale: 0.92,
    x: direction > 0 ? 120 : -120,
    y: 20,
    filter: 'blur(12px)',
  }),
  center: {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    opacity: 0,
    scale: 0.92,
    x: direction > 0 ? -120 : 120,
    y: -20,
    filter: 'blur(12px)',
  }),
};

const phaseTransition = {
  type: 'tween' as const,
  duration: 0.7,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

interface StepGatheringProps {
  business: BusinessData;
  locations: LocationItem[];
  gatheringData: GatheringData;
  onComplete: () => void;
}

export function StepGathering({
  business,
  locations,
  gatheringData,
  onComplete,
}: StepGatheringProps) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [completedPhaseIds, setCompletedPhaseIds] = useState<Set<string>>(new Set());
  const [autoAdvance, setAutoAdvance] = useState(true);
  const phaseStartRef = useRef(Date.now());
  const completedRef = useRef(false);
  const prevPhaseRef = useRef(0);

  const currentPhase = PHASES[currentPhaseIndex];
  const businessName = business.name;

  // Track direction for transitions
  const direction = currentPhaseIndex >= prevPhaseRef.current ? 1 : -1;
  useEffect(() => {
    prevPhaseRef.current = currentPhaseIndex;
  }, [currentPhaseIndex]);

  // Mark branded-app (last phase) as completed immediately when we land on it
  useEffect(() => {
    if (PHASES[currentPhaseIndex]?.id === 'branded-app') {
      setCompletedPhaseIds((prev) => new Set([...prev, 'branded-app']));
    }
  }, [currentPhaseIndex]);

  const advancePhase = useCallback(() => {
    setCompletedPhaseIds((prev) => new Set([...prev, PHASES[currentPhaseIndex].id]));

    if (currentPhaseIndex < PHASES.length - 1) {
      setCurrentPhaseIndex((prev) => prev + 1);
      phaseStartRef.current = Date.now();
    } else if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [currentPhaseIndex, onComplete]);

  // Auto-advance timers (skip phases with Infinity durations — they advance via callbacks)
  useEffect(() => {
    if (!autoAdvance) return;

    const phase = PHASES[currentPhaseIndex];

    // Phases with Infinity min duration are controlled externally (e.g. report, branded-app)
    if (!isFinite(phase.minDurationMs)) return;

    const elapsed = Date.now() - phaseStartRef.current;
    const remaining = Math.max(0, phase.minDurationMs - elapsed);

    const dataIsReady = phase.dataReady(gatheringData);

    if (dataIsReady && remaining <= 0) {
      advancePhase();
      return;
    }

    const minTimer = setTimeout(() => {
      if (phase.dataReady(gatheringData)) {
        advancePhase();
      }
    }, remaining);

    // Only set max timer if finite
    let maxTimer: ReturnType<typeof setTimeout> | undefined;
    if (isFinite(phase.maxDurationMs)) {
      const maxRemaining = Math.max(0, phase.maxDurationMs - elapsed);
      maxTimer = setTimeout(() => {
        advancePhase();
      }, maxRemaining);
    }

    return () => {
      clearTimeout(minTimer);
      if (maxTimer !== undefined) clearTimeout(maxTimer);
    };
  }, [currentPhaseIndex, gatheringData, advancePhase, autoAdvance]);

  // React to data arriving mid-phase
  useEffect(() => {
    if (!autoAdvance) return;
    if (currentPhaseIndex >= PHASES.length) return;

    const phase = PHASES[currentPhaseIndex];
    if (!isFinite(phase.minDurationMs)) return;
    if (!phase.dataReady(gatheringData)) return;

    const elapsed = Date.now() - phaseStartRef.current;
    if (elapsed >= phase.minDurationMs) {
      advancePhase();
    }
  }, [gatheringData, currentPhaseIndex, advancePhase, autoAdvance]);

  // Manual navigation
  const goToPrev = useCallback(() => {
    setAutoAdvance(false);
    if (currentPhaseIndex > 0) {
      setCurrentPhaseIndex((prev) => prev - 1);
      phaseStartRef.current = Date.now();
    }
  }, [currentPhaseIndex]);

  const goToNext = useCallback(() => {
    setAutoAdvance(false);
    if (currentPhaseIndex < PHASES.length - 1) {
      setCompletedPhaseIds((prev) => new Set([...prev, PHASES[currentPhaseIndex].id]));
      setCurrentPhaseIndex((prev) => prev + 1);
      phaseStartRef.current = Date.now();
    } else if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [currentPhaseIndex, onComplete]);

  // Auto-navigate from report to branded-app when data is fully loaded
  const handleReportComplete = useCallback(() => {
    if (autoAdvance) {
      advancePhase();
    }
  }, [autoAdvance, advancePhase]);

  const renderAnimation = () => {
    switch (currentPhase.id) {
      case 'locations':
        return <GatheringMap locations={locations} isActive />;
      case 'reviews':
        return (
          <GatheringReviews
            reviews={gatheringData.reviews}
            isActive
          />
        );
      case 'photos':
        return (
          <GatheringPhotos
            photos={gatheringData.photos}
            logoUrl={business.logoUrl}
            brandColors={business.brandColors}
            businessName={businessName}
            isActive
          />
        );
      case 'report':
        return (
          <GatheringReport
            insights={gatheringData.insights}
            company={gatheringData.company}
            persons={gatheringData.persons}
            businessName={businessName}
            isActive
            onComplete={handleReportComplete}
          />
        );
      case 'branded-app':
        return (
          <GatheringBrandedApp
            businessName={businessName}
            logoUrl={business.logoUrl}
            brandColors={business.brandColors}
            locations={locations}
            isActive
          />
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      className="relative w-full h-dvh"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Sidebar — floating over content */}
      <div className="absolute top-4 left-4 bottom-4 z-40 w-64">
        <GatheringSidebar
          steps={SIDEBAR_STEPS}
          currentStepIndex={currentPhaseIndex}
          completedStepIds={completedPhaseIds}
          activeDescription={SIDEBAR_STEPS[currentPhaseIndex]?.description}
        />
      </div>

      {/* Full-bleed content area */}
      <div className="w-full h-full relative overflow-hidden">
        {(currentPhase.id === 'locations' || currentPhase.id === 'reviews' || currentPhase.id === 'photos') && (
          <div className="absolute top-4 z-30 w-full max-w-md px-6" style={{ left: 'calc(50% + 140px)', transform: 'translateX(-50%)' }}>
            <TypewriterSearch key={currentPhase.id} text={currentPhase.searchText(businessName)} />
          </div>
        )}

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPhase.id}
            className="h-full"
            style={currentPhase.id !== 'locations' ? { paddingLeft: 280 } : undefined}
            custom={direction}
            variants={phaseVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={phaseTransition}
          >
            {renderAnimation()}
          </motion.div>
        </AnimatePresence>

        {/* Scan line — on map, reviews, and photos */}
        {(currentPhase.id === 'locations' || currentPhase.id === 'reviews' || currentPhase.id === 'photos') && (
          <motion.div
            key={`scan-${currentPhase.id}`}
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
        )}

        {/* Prev / Next navigation buttons */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
          <button
            onClick={goToPrev}
            disabled={currentPhaseIndex === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200 text-xs font-medium text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <ChevronLeft className="size-3.5" />
            Prev
          </button>
          <span className="text-[10px] font-mono text-gray-400 px-2">
            {currentPhaseIndex + 1} / {PHASES.length}
          </span>
          <button
            onClick={goToNext}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200 text-xs font-medium text-gray-600 hover:bg-white transition-all shadow-sm"
          >
            Next
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
