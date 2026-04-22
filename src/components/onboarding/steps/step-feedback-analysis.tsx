'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useOnboarding } from '@/lib/demo-flow-context';
import { GatheringFeedbackReport } from '../animations/gathering-feedback-report';
import { ProgressBar } from '../ui/progress-bar';

interface StepFeedbackAnalysisProps {
  /** Called when report has been visible for ~10s AND branding fetch is ready */
  onReady: () => void;
}

const REPORT_VISIBLE_BEFORE_ADVANCE_MS = 10_000;
const MAX_WAIT_FOR_BRANDING_MS = 30_000;

export function StepFeedbackAnalysis({ onReady }: StepFeedbackAnalysisProps) {
  const { state } = useOnboarding();
  const { gatheringData, business, pipelineStages } = state;
  const report = gatheringData.guestFeedbackReport;
  const advancedRef = useRef(false);
  const reportFirstShownRef = useRef<number | null>(null);
  const [, forceUpdate] = useState(0);

  // Determine if branding fetch is ready (has colors beyond placeholder white)
  const brandingReady =
    !!business &&
    business.brandColors.length > 0 &&
    !(business.brandColors.length === 1 && business.brandColors[0] === '#FFFFFF');

  // Track when the report first becomes visible
  useEffect(() => {
    if (report && reportFirstShownRef.current === null) {
      reportFirstShownRef.current = Date.now();
    }
  }, [report]);

  // Poll/check for advance conditions
  useEffect(() => {
    if (!report || advancedRef.current) return;

    const interval = setInterval(() => {
      if (advancedRef.current) {
        clearInterval(interval);
        return;
      }
      const shownFor = reportFirstShownRef.current ? Date.now() - reportFirstShownRef.current : 0;

      // Branding ready + report shown 10s → advance
      // OR safety: report shown 30s regardless of branding → advance anyway
      if (
        (brandingReady && shownFor >= REPORT_VISIBLE_BEFORE_ADVANCE_MS) ||
        shownFor >= MAX_WAIT_FOR_BRANDING_MS
      ) {
        advancedRef.current = true;
        clearInterval(interval);
        onReady();
      } else {
        forceUpdate((v) => v + 1); // re-render to update countdown if shown
      }
    }, 500);

    return () => clearInterval(interval);
  }, [report, brandingReady, onReady]);

  // ── Render ────────────────────────────────────────────────────────────

  // Phase A: still gathering (no report yet) — show stage tracker
  if (!report) {
    return (
      <motion.div
        className="relative w-full h-dvh flex items-center justify-center bg-gray-50/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full px-4 sm:px-8 max-w-xl">
          <ProgressBar current={1} variant="feedback" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 w-full max-w-md mx-4 sm:mx-0">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Generating your report</h3>
          <p className="text-xs text-gray-400 mb-6">Reading guest reviews and surfacing patterns</p>
          <div className="space-y-3">
            {pipelineStages.map((stage) => (
              <div key={stage.id} className="flex items-center gap-3">
                <div className="size-5 shrink-0 flex items-center justify-center">
                  {stage.status === 'done' && (
                    <div className="size-5 rounded-full bg-[#625CE4] flex items-center justify-center">
                      <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {stage.status === 'active' && <Loader2 className="size-4 text-[#625CE4] animate-spin" />}
                  {stage.status === 'pending' && <div className="size-3 rounded-full border-2 border-gray-200" />}
                </div>
                <span
                  className={`text-sm transition-colors ${
                    stage.status === 'done'
                      ? 'text-gray-400'
                      : stage.status === 'active'
                        ? 'text-gray-900 font-medium'
                        : 'text-gray-300'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // Phase B: report ready — show it full screen
  return (
    <motion.div
      className="w-full h-dvh overflow-hidden bg-gray-50/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full h-full overflow-y-auto [&::-webkit-scrollbar]:hidden pb-24">
        <GatheringFeedbackReport report={report} isActive />
      </div>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full px-4 sm:px-8 max-w-xl">
        <ProgressBar current={1} variant="feedback" />
      </div>
    </motion.div>
  );
}
