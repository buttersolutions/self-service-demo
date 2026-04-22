'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STEPS_BY_VARIANT, type ProgressBarVariant } from './progress-steps';

interface ProgressSidebarProps {
  current: number;
  variant?: ProgressBarVariant;
  className?: string;
  /**
   * When true, renders inline without portal/fixed positioning, suitable for
   * embedding inside a container (e.g. the OnboardingShell sidebar).
   */
  inline?: boolean;
}

export function ProgressSidebar({ current, variant = 'default', className, inline = false }: ProgressSidebarProps) {
  const STEPS = STEPS_BY_VARIANT[variant];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!inline && !mounted) return null;

  const wrapperClass = inline
    ? cn('w-full font-sans', className)
    : cn(
        'fixed top-20 left-4 z-40 w-60 rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] px-4 py-5 font-sans',
        className,
      );

  const content = (
    <motion.div
      className={wrapperClass}
      initial={inline ? false : { opacity: 0, x: -32 }}
      animate={inline ? undefined : { opacity: 1, x: 0 }}
      transition={inline ? undefined : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.p
        className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-1 mb-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Your progress
      </motion.p>

      <div className="relative">
        {/* Vertical connector lines between dots */}
        <div className="absolute left-[9px] top-[18px] bottom-[18px] flex flex-col pointer-events-none">
          {STEPS.map((_, i) => {
            if (i === 0) return null;
            const completed = i < current;
            const active = i === current;
            return (
              <div
                key={`line-${i}`}
                className="flex-1 w-[2px] bg-gray-200 overflow-hidden"
              >
                <motion.div
                  className="w-full"
                  initial={{ height: '0%' }}
                  animate={{
                    height: completed || active ? '100%' : '0%',
                    backgroundColor: '#625CE4',
                  }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            );
          })}
        </div>

        {/* Dot + label rows */}
        <div className="relative z-10 flex flex-col">
          {STEPS.map((label, i) => {
            const completed = i < current;
            const active = i === current;

            return (
              <motion.div
                key={label}
                className="flex items-center gap-3 py-2"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.08, duration: 0.3 }}
              >
                <div
                  className={cn(
                    'size-5 flex items-center justify-center rounded-full shrink-0 bg-white',
                    completed
                      ? 'bg-[#625CE4]'
                      : active
                        ? 'border-2 border-[#625CE4]'
                        : 'border-[1.5px] border-gray-300',
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

                <span
                  className={cn(
                    'text-[13px] leading-tight transition-colors duration-300',
                    completed
                      ? 'text-[#625CE4] font-medium'
                      : active
                        ? 'text-gray-900 font-medium'
                        : 'text-gray-400',
                  )}
                >
                  {label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );

  if (inline) return content;
  return createPortal(content, document.body);
}
