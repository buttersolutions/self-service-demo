'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export const OnboardingInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      className={cn(
        'w-full h-[56px] rounded-2xl bg-white px-5 shadow-xs text-[16px] text-gray-900',
        'border border-gray-200',
        'placeholder:text-gray-400',
        'outline-none transition-all duration-200',
        'focus:border-gray-300 focus:ring-none',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

OnboardingInput.displayName = 'OnboardingInput';
