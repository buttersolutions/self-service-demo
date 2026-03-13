'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';
import type { ReviewItem } from '../types';

interface GatheringReviewsProps {
  reviews: ReviewItem[] | null;
  isActive: boolean;
}

const REVEAL_INTERVAL_MS = 800;
const MAX_VISIBLE = 20;

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3 ${
            i < rating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

export function GatheringReviews({ reviews, isActive }: GatheringReviewsProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isLoading = reviews === null;
  const reviewList = reviews ?? [];

  // Shuffle reviews for organic feel
  const shuffledReviews = useMemo(() => {
    const arr = [...reviewList];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [reviewList]);

  useEffect(() => {
    if (!isActive || isLoading) return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    const max = Math.min(shuffledReviews.length, MAX_VISIBLE);
    if (visibleCount >= max) return;

    intervalRef.current = setInterval(() => {
      setVisibleCount((prev) => {
        const next = prev + 1;
        if (next >= max && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return next;
      });
    }, REVEAL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isLoading, shuffledReviews.length]);

  // Auto-scroll to bottom as new reviews appear
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [visibleCount]);

  const visibleReviews = shuffledReviews.slice(0, visibleCount);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        ref={listRef}
        className="w-full max-w-lg h-full overflow-y-auto scroll-smooth px-4 pt-16 pb-20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 85%, transparent 100%)' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              className="flex items-center gap-2 text-sm text-gray-400"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="size-1.5 rounded-full bg-[#625CE4] animate-pulse" />
              Loading reviews...
            </motion.div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {visibleReviews.map((review, i) => (
                <motion.div
                  key={`review-${i}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 30, rotate: 0 }}
                  animate={{ opacity: 1, scale: 1, y: 0, rotate: i % 2 === 0 ? -0.8 : 0.8 }}
                  transition={{
                    type: 'spring',
                    stiffness: 350,
                    damping: 28,
                    mass: 0.8,
                    opacity: { duration: 0.3 },
                  }}
                >
                  <div
                    className="bg-white rounded-2xl p-4 border border-gray-100"
                    style={{
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0">
                        {(review.author ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-medium text-gray-700 block truncate">
                          {review.author ?? 'Anonymous'}
                        </span>
                        <StarRating rating={review.rating} />
                      </div>
                      {review.date && (
                        <span className="text-[10px] text-gray-300 shrink-0">{review.date}</span>
                      )}
                    </div>
                    <p className="text-[13px] leading-relaxed text-gray-500 line-clamp-4">
                      {review.text}
                    </p>
                    <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-gray-50">
                      <svg viewBox="0 0 24 24" className="size-3 opacity-50" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span className="text-[10px] text-gray-400 font-medium">Google</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Spacer at bottom for scroll */}
            <div className="h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
