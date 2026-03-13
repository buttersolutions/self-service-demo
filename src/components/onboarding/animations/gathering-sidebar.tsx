'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Circle, Clock } from 'lucide-react';

export interface SidebarStep {
  id: string;
  label: string;
  description: string;
}

interface GatheringSidebarProps {
  steps: SidebarStep[];
  currentStepIndex: number;
  completedStepIds: Set<string>;
  activeDescription?: string;
}

function EstimatedTimeCard() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = Math.max(0, 35 - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = remaining > 0
    ? `~${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`
    : 'Almost done!';

  return (
    <motion.div
      className="mx-3.5 mb-3 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.4 }}
    >
      <div className="flex items-center gap-2">
        <Clock className="size-3.5 text-gray-400 shrink-0" />
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
          Est. time
        </span>
      </div>
      <motion.div
        key={display}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        className="text-sm font-semibold text-gray-600 mt-0.5 pl-5.5"
        style={{ paddingLeft: 22 }}
      >
        {display}
      </motion.div>
    </motion.div>
  );
}

export function GatheringSidebar({
  steps,
  currentStepIndex,
  completedStepIds,
  activeDescription,
}: GatheringSidebarProps) {
  const allDone = completedStepIds.size === steps.length;

  return (
    <motion.div
      className="h-full flex flex-col rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] font-sans"
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex-1 px-3.5 py-5">
        <motion.p
          className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-2.5 mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Setting up your app
        </motion.p>

        <div className="space-y-0.5">
          {steps.map((step, index) => {
            const isCompleted = completedStepIds.has(step.id);
            const isCurrent = index === currentStepIndex && !allDone;
            const isPending = !isCompleted && !isCurrent;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + index * 0.1, duration: 0.35 }}
                className={`flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl transition-colors duration-300 ${
                  isCurrent ? 'bg-gray-50' : ''
                }`}
              >
                <div className="shrink-0 relative mt-0.5">
                  {isCompleted ? (
                    <>
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0.6 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="absolute inset-0 bg-[#625CE4] rounded-full"
                      />
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        className="size-5 bg-[#625CE4] rounded-full flex items-center justify-center relative"
                      >
                        <Check className="size-3 text-white" strokeWidth={3} />
                      </motion.div>
                    </>
                  ) : isCurrent ? (
                    <div className="size-5 flex items-center justify-center">
                      <Loader2 className="size-4 text-[#625CE4] animate-spin" />
                    </div>
                  ) : (
                    <div className="size-5 flex items-center justify-center">
                      <Circle className="size-3.5 text-gray-300" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span
                    className={`text-[13px] font-medium block ${
                      isPending ? 'text-gray-300' : 'text-gray-900'
                    }`}
                  >
                    {isCurrent ? (
                      <span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        {step.label}
                      </span>
                    ) : (
                      step.label
                    )}
                  </span>
                  {isCurrent && (
                    <motion.span
                      key={activeDescription ?? step.description}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="text-[11px] text-gray-400 block mt-0.5 leading-tight"
                    >
                      {activeDescription ?? step.description}
                    </motion.span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

    
        <EstimatedTimeCard />
    
    </motion.div>
  );
}
