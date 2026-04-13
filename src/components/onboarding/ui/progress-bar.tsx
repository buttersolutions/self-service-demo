'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS_BY_VARIANT = {
  default: [
    'Find your business',
    'App Branding',
    'Get your app',
  ],
  feedback: [
    'Find your business',
    'Your guest report',
    'Your solution',
    'Get the app',
  ],
} as const;

export type ProgressBarVariant = keyof typeof STEPS_BY_VARIANT;

interface ProgressBarProps {
  current: number; // 0-indexed into the variant's step list
  variant?: ProgressBarVariant;
  className?: string;
}

export function ProgressBar({ current, variant = 'default', className }: ProgressBarProps) {
  const STEPS = STEPS_BY_VARIANT[variant];
  return (
    <div
      className={cn(
        'bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 px-3 sm:px-8 py-4 w-full mx-auto',
        className,
      )}
    >
      <div className="relative">
        {/* Connecting lines — laid out between dot centers */}
        <div className="absolute top-[10px] left-0 right-0 flex">
          {STEPS.map((_, i) => {
            if (i === 0) return null;
            const completed = i < current;
            const active = i === current;
            return (
              <div
                key={`line-${i}`}
                className="flex-1 h-[2px] bg-gray-200 overflow-hidden"
                style={i === 1 ? { marginLeft: 'calc(12.5% + 10px)' } : i === STEPS.length - 1 ? { marginRight: 'calc(12.5% + 10px)' } : undefined}
              >
                <motion.div
                  className="h-full"
                  initial={{ width: '0%' }}
                  animate={{
                    width: completed || active ? '100%' : '0%',
                    backgroundColor: '#625CE4',
                  }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            );
          })}
        </div>

        {/* Dots + labels grid — evenly spaced */}
        <div className="relative z-10 grid" style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}>
          {STEPS.map((label, i) => {
            const completed = i < current;
            const active = i === current;

            return (
              <div key={label} className="flex flex-col items-center gap-1.5">
                {/* Dot */}
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full shrink-0',
                    completed
                      ? 'size-5 bg-[#625CE4]'
                      : active
                        ? 'size-5 border-2 border-[#625CE4] bg-white'
                        : 'size-5 border-[1.5px] border-gray-300 bg-white',
                  )}
                >
                  {completed && <Check className="size-3 text-white" strokeWidth={3} />}
                  {active && (
                    <motion.div
                      className="size-2 rounded-full"
                      animate={{ backgroundColor: ['#625CE4', '#c4b5fd', '#625CE4'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    'text-[9px] sm:text-[10px] leading-tight text-center transition-colors duration-300',
                    completed
                      ? 'text-[#625CE4] font-medium'
                      : active
                        ? 'text-gray-900 font-medium'
                        : 'text-gray-400',
                  )}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
