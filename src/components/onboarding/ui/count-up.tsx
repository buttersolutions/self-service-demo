'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  separator?: boolean;
}

export function CountUp({
  to,
  from = 0,
  duration = 1.2,
  delay = 0,
  className,
  prefix = '',
  suffix = '',
  separator = false,
}: CountUpProps) {
  const [value, setValue] = useState(from);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const durationMs = duration * 1000;

      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / durationMs, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(from + (to - from) * eased);
        setValue(current);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    }, delay * 1000);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [to, from, duration, delay]);

  const formatted = separator
    ? value.toLocaleString()
    : String(value);

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
