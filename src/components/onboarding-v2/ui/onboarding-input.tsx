'use client';

import { cn } from '@/lib/utils';
import { forwardRef, type ReactNode } from 'react';

interface OnboardingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
}

export const OnboardingInput = forwardRef<HTMLInputElement, OnboardingInputProps>(
  ({ className, icon, ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative w-full">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
          <input
            className={cn(
              'w-full h-[56px] rounded-2xl bg-white pl-11 pr-5 shadow-xs text-[16px] text-gray-900',
              'border border-gray-200',
              'placeholder:text-gray-400',
              'outline-none transition-all duration-200',
              'focus:border-gray-300 focus:ring-none',
              className,
            )}
            ref={ref}
            {...props}
          />
        </div>
      );
    }

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
  },
);

OnboardingInput.displayName = 'OnboardingInput';
