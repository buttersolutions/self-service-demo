'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PaginationDotsProps {
  total: number;
  current: number;
  className?: string;
}

export function PaginationDots({ total, current, className }: PaginationDotsProps) {
  return (
    <div className={cn('flex items-center justify-center gap-1.5', className)}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          animate={{
            width: i === current ? 18 : 6,
            height: 6,
            backgroundColor: i === current ? '#a3a3a3' : '#e5e5e5',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      ))}
    </div>
  );
}
