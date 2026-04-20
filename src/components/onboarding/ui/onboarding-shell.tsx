'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { ProgressSidebar } from './progress-sidebar';
import { AllgravyLogo } from '@/components/ui/allgravy-logo';
import type { ProgressBarVariant } from './progress-steps';

interface OnboardingShellProps {
  /** Which step index is active in the progress list. */
  current: number;
  variant?: ProgressBarVariant;
  onBack?: () => void;
  children: ReactNode;
}

/**
 * Shared chrome for every step after the initial search: a purple backdrop,
 * white rounded card, progress sidebar on the left, and a swappable main slot
 * on the right. The shell itself is stable across step changes — only the
 * children animate in/out — so the sidebar and card don't flicker.
 */
export function OnboardingShell({ current, variant = 'default', onBack, children }: OnboardingShellProps) {
  return (
    <div className="fixed inset-0 w-full h-dvh p-2 sm:p-4 bg-[#625CE4]">
      <motion.div
        className="w-full h-full flex flex-col md:flex-row rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Sidebar — desktop only */}
        <aside className="hidden md:flex w-72 shrink-0 flex-col border-r border-gray-200/80 bg-gray-50 px-4 py-5">
          <div className="flex items-center gap-2 mb-6 px-1">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="size-8 -ml-2 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Back"
              >
                <ChevronLeft className="size-5" />
              </button>
            ) : null}
            <AllgravyLogo className="w-20 text-gray-900" />
          </div>
          <ProgressSidebar inline current={current} variant={variant} />
        </aside>

        {/* Main — swappable content */}
        <main className="flex-1 min-w-0 relative overflow-hidden">
          {children}
        </main>
      </motion.div>
    </div>
  );
}
