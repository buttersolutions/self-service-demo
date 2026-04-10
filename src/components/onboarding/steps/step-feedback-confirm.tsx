'use client';

import { motion } from 'framer-motion';
import { useOnboarding } from '@/lib/demo-flow-context';
import { GatheringFeedbackReport } from '../animations/gathering-feedback-report';
import { StepConfirm } from './step-confirm';
import { ProgressBar } from '../ui/progress-bar';
import type { LocationItem } from '../types';

interface StepFeedbackConfirmProps {
  onConfirm: (data: { name: string; website: string; colors: string[]; locations: LocationItem[] }) => void;
}

/**
 * Split layout shown after the feedback report is ready:
 * - Left: the GuestFeedbackReport (continues displaying)
 * - Right: a sliding-in branding confirmation panel (reuses StepConfirm)
 */
export function StepFeedbackConfirm({ onConfirm }: StepFeedbackConfirmProps) {
  const { state } = useOnboarding();
  const report = state.gatheringData.guestFeedbackReport;

  return (
    <div className="relative w-full h-dvh flex bg-gray-50/40 overflow-hidden">
      {/* Left: report (60%) */}
      <motion.div
        className="flex-1 h-full overflow-y-auto [&::-webkit-scrollbar]:hidden border-r border-gray-200"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
      >
        {report && <GatheringFeedbackReport report={report} isActive />}
      </motion.div>

      {/* Right: branding confirm panel (40%, slides in from right) */}
      <motion.div
        className="w-[440px] shrink-0 h-full bg-white border-l border-gray-200 shadow-2xl overflow-y-auto [&::-webkit-scrollbar]:hidden"
        initial={{ x: 440, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      >
        <div className="py-12 px-2">
          <StepConfirm direction={1} onConfirm={onConfirm} hideProgressBar />
        </div>
      </motion.div>

      <div className="fixed bottom-6 left-8 z-30 w-full max-w-xl px-8" style={{ width: 'calc(100% - 440px)' }}>
        <ProgressBar current={2} variant="feedback" />
      </div>
    </div>
  );
}
