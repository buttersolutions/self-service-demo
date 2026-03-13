'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface OnboardingButtonProps {
  children?: React.ReactNode;
  className?: string;
  loading?: boolean;
  loadingText?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function OnboardingButton({
  children,
  className,
  loading = false,
  loadingText = 'Analyzing...',
  active = false,
  disabled,
  onClick,
}: OnboardingButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      className={cn(
        'relative w-full h-[52px] rounded-2xl text-[15px] font-medium',
        'transition-all duration-200 select-none outline-none',
              'bg-gradient-to-b from-[#6e69e8] to-[#625CE4] text-white cursor-pointer',
              'shadow-[0_1px_3px_rgba(98,92,228,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]',
              'hover:from-[#7a76ec] hover:to-[#6e69e8]',
              'hover:shadow-[0_3px_8px_rgba(98,92,228,0.35),inset_0_1px_0_rgba(255,255,255,0.15)]',
              'active:shadow-[0_1px_2px_rgba(98,92,228,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]',
              'active:translate-y-[0.5px]',
        isDisabled && !loading && 'cursor-not-allowed opacity-80',
        loading && [
          'cursor-wait'
        ],
        className,
      )}
      disabled={isDisabled}
      onClick={onClick}
      whileTap={active && !loading ? { scale: 0.99 } : undefined}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
