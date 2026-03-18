'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { StaffMention, StaffAnalysis } from '@/lib/types';
import type { ReviewItem } from '../types';
import { SquaresBackground } from './squares-background';

interface GatheringStaffAnalysisProps {
  mentions: StaffMention[];
  analysis: StaffAnalysis | null;
  reviews: ReviewItem[] | null;
  isActive: boolean;
  onComplete?: () => void;
}

interface StatLine {
  label: string;
  value: string;
  long?: boolean;
}

function buildStats(analysis: StaffAnalysis, mentions: StaffMention[]): StatLine[] {
  const stats: StatLine[] = [];

  if (analysis.headline) {
    stats.push({ label: 'Summary', value: analysis.headline });
  }

  if (analysis.positiveCount > 0 || analysis.negativeCount > 0) {
    stats.push({
      label: 'Sentiment',
      value: `${analysis.positiveCount} positive · ${analysis.negativeCount} negative`,
    });
  }

  if (analysis.namedEmployees.length > 0) {
    const joined = analysis.namedEmployees.join(', ');
    stats.push({
      label: 'Named Employees',
      value: joined,
      long: joined.length > 100,
    });
  }

  if (analysis.standoutEmployee) {
    stats.push({ label: 'Standout Employee', value: analysis.standoutEmployee });
  }

  // NOTE: reviews block is inserted here (between standout employee and insight)
  // via the block builder in the main component — not in this function

  if (analysis.body) {
    stats.push({ label: 'Insight', value: analysis.body, long: true });
  }

  // Show up to 3 top mentions as quotes
  const topMentions = mentions.slice(0, 3);
  for (const mention of topMentions) {
    const rawAuthor = mention.reviewAuthor;
    const author = (rawAuthor && rawAuthor !== 'undefined') ? rawAuthor : 'Anonymous';
    const names = mention.staffNames.length > 0 ? ` — about ${mention.staffNames.join(', ')}` : '';
    stats.push({
      label: `${mention.sentiment === 'positive' ? '★' : '✦'} ${author}${names}`,
      value: `"${mention.relevantExcerpt}"`,
      long: mention.relevantExcerpt.length > 100,
    });
  }

  return stats;
}

// ── Helpers ──────────────────────────────────────────────────────────

function highlightNames(text: string, names: string[]): React.ReactNode {
  if (names.length === 0) return text;

  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    if (pattern.test(part)) {
      return (
        <span key={i} className="font-semibold text-gray-800">
          {part}
        </span>
      );
    }
    return part;
  });
}

function pickRelevantReviews(reviews: ReviewItem[]): ReviewItem[] {
  const sorted = [...reviews].sort((a, b) => b.rating - a.rating);
  const high = sorted.find((r) => r.rating >= 4);
  const low = sorted.find((r) => r.rating <= 2);
  const mid = sorted.find((r) => r.rating === 3) ?? sorted.find((r) => r !== high && r !== low);
  return [high, mid, low].filter((r): r is ReviewItem => r !== undefined).slice(0, 3);
}

// ── Small UI pieces ─────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${
            i < rating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

function TypewriterText({
  text,
  delay = 0,
  speed = 20,
  onDone,
}: {
  text: string;
  delay?: number;
  speed?: number;
  onDone?: () => void;
}) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
      } else {
        clearInterval(interval);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [started, text, speed, onDone]);

  if (!started) return null;

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <motion.span
          className="inline-block w-[2px] h-[1em] bg-gray-400 ml-0.5 align-text-bottom"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </span>
  );
}

// ── Stat block ──────────────────────────────────────────────────────

function StatBlock({
  label,
  value,
  long,
  onDone,
}: {
  label: string;
  value: string;
  long?: boolean;
  onDone: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#625CE4]/60 mb-1">
        {label}
      </div>
      <div className="text-2xl font-light text-gray-800 leading-relaxed font-serif">
        <TypewriterText text={value} delay={150} speed={long ? 12 : 20} onDone={onDone} />
      </div>
    </motion.div>
  );
}

// ── Review cards — staggered reveal ─────────────────────────────────

function ReviewCards({
  reviews,
  namedEmployees,
  onDone,
}: {
  reviews: ReviewItem[];
  namedEmployees: string[];
  onDone: () => void;
}) {
  const [revealedCard, setRevealedCard] = useState(-1);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Reveal cards one by one — stable deps to prevent looping
  useEffect(() => {
    const count = reviews.length;
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < count; i++) {
      timers.push(setTimeout(() => setRevealedCard(i), 400 + i * 700));
    }

    // Signal done after all cards + a pause
    timers.push(setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDoneRef.current();
      }
    }, 400 + count * 700 + 500));

    return () => timers.forEach(clearTimeout);
  }, [reviews.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#625CE4]/60 mb-4">
        Relevant Reviews
      </div>
      <div className="flex gap-4 flex-wrap">
        {reviews.map((review, ri) => {
          if (ri > revealedCard) return null;
          const displayText = review.text.length > 180 ? review.text.slice(0, 180) + '...' : review.text;
          const rotations = [-1.5, 1, -0.8];
          const rotate = rotations[ri % rotations.length];
          return (
            <motion.div
              key={`review-${ri}`}
              initial={{ opacity: 0, y: 30, rotate: rotate * 3, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, rotate, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="bg-white rounded-2xl p-5 border border-gray-100 max-w-[280px]"
              style={{
                boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 6px rgba(0,0,0,0.04)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="size-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500 shrink-0">
                  {(review.author ?? '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[14px] font-medium text-gray-700 block truncate">
                    {review.author ?? 'Anonymous'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <StarRating rating={review.rating} />
                    {review.rating >= 4 ? (
                      <ThumbsUp className="size-3.5 text-green-400" />
                    ) : review.rating <= 2 ? (
                      <ThumbsDown className="size-3.5 text-red-400" />
                    ) : null}
                  </div>
                </div>
              </div>
              <p className="text-[13px] leading-relaxed text-gray-500">
                {highlightNames(displayText, namedEmployees)}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Main component ──────────────────────────────────────────────────

export function GatheringStaffAnalysis({ mentions, analysis, reviews, isActive, onComplete }: GatheringStaffAnalysisProps) {
  const [phase, setPhase] = useState<'loading' | 'stats'>('loading');
  const [revealedIndex, setRevealedIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const completeCalledRef = useRef(false);

  const isDataReady = analysis !== null;
  const relevantReviews = reviews ? pickRelevantReviews(reviews) : [];

  // Build blocks: insert reviews between standout employee and insight
  const blocks: Array<{ kind: 'stat'; stat: StatLine } | { kind: 'reviews' }> = [];
  if (isDataReady) {
    const stats = buildStats(analysis, mentions);
    // Find where Insight starts — insert reviews before it
    const insightIdx = stats.findIndex((s) => s.label === 'Insight');
    const insertAt = insightIdx >= 0 ? insightIdx : stats.length;

    for (let si = 0; si < stats.length; si++) {
      if (si === insertAt && relevantReviews.length > 0) {
        blocks.push({ kind: 'reviews' });
      }
      blocks.push({ kind: 'stat', stat: stats[si] });
    }
    // If insert point was at the end
    if (insertAt >= stats.length && relevantReviews.length > 0) {
      blocks.push({ kind: 'reviews' });
    }
  }

  const isEmpty = isDataReady && mentions.length === 0 && !analysis.headline;

  // Transition from loading to stats when data arrives
  useEffect(() => {
    if (!isActive || !isDataReady || phase !== 'loading') return;
    const timer = setTimeout(() => setPhase('stats'), 800);
    return () => clearTimeout(timer);
  }, [isActive, isDataReady, phase]);

  // Advance to the next block
  const advanceBlock = useCallback(() => {
    setRevealedIndex((prev) => prev + 1);
  }, []);

  // Fire onComplete 2 seconds after all blocks have been revealed
  useEffect(() => {
    if (blocks.length === 0 || revealedIndex < blocks.length) return;
    if (completeCalledRef.current) return;

    const timer = setTimeout(() => {
      if (!completeCalledRef.current) {
        completeCalledRef.current = true;
        onComplete?.();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [revealedIndex, blocks.length, onComplete]);

  // Start slow auto-scroll once we're a few blocks in
  const startAutoScroll = useCallback(() => {
    if (scrollingRef.current) return;
    scrollingRef.current = true;

    const scroll = () => {
      if (!scrollingRef.current || !scrollRef.current) return;
      const s = scrollRef.current;
      if (s.scrollTop + s.clientHeight < s.scrollHeight - 2) {
        s.scrollTop += 1.2;
      }
      rafRef.current = requestAnimationFrame(scroll);
    };

    rafRef.current = requestAnimationFrame(scroll);
  }, []);

  // Clean up auto-scroll
  useEffect(() => {
    return () => {
      scrollingRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Start scrolling after a few blocks are revealed
  useEffect(() => {
    if (phase !== 'stats') return;
    if (revealedIndex >= 3) {
      const timer = setTimeout(startAutoScroll, 800);
      return () => clearTimeout(timer);
    }
  }, [phase, revealedIndex, startAutoScroll]);

  return (
    <div
      ref={scrollRef}
      className="w-full h-full overflow-y-auto overflow-x-hidden scroll-smooth relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      {/* Grid background — visible during loading */}
      <AnimatePresence>
        {phase === 'loading' && (
          <motion.div
            className="absolute inset-0 z-0"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <SquaresBackground
              direction="diagonal"
              speed={0.3}
              borderColor="rgba(98, 92, 228, 0.08)"
              squareSize={40}
              hoverFillColor="rgba(98, 92, 228, 0.04)"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      <AnimatePresence>
        {phase === 'loading' && (
          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center"
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="flex items-center justify-center gap-3 mb-3">
                <motion.div
                  className="size-2.5 rounded-full bg-[#625CE4]"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <h2 className="text-2xl font-light text-gray-800 font-serif tracking-tight">
                  Analysing reviews
                </h2>
              </div>
              <p className="text-sm text-gray-400">
                Extracting key insights from customer feedback...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {phase === 'stats' && isEmpty && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <span className="text-sm text-gray-400">No staff mentions found</span>
        </div>
      )}

      {/* Sequential reveal of blocks */}
      <AnimatePresence>
        {phase === 'stats' && !isEmpty && blocks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative z-10 px-12 pt-20 space-y-10"
            style={{ paddingBottom: '40vh' }}
          >
            <div className="space-y-8">
              {blocks.map((block, i) => {
                if (i > revealedIndex) return null;

                const isActiveBlock = i === revealedIndex;

                if (block.kind === 'reviews') {
                  return (
                    <ReviewCards
                      key="review-cards"
                      reviews={relevantReviews}
                      namedEmployees={isDataReady ? analysis.namedEmployees : []}
                      onDone={isActiveBlock ? advanceBlock : () => {}}
                    />
                  );
                }

                // Completed stat blocks render as static text
                if (!isActiveBlock) {
                  return (
                    <div key={`done-${block.stat.label}`}>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#625CE4]/60 mb-1">
                        {block.stat.label}
                      </div>
                      <div className="text-2xl font-light text-gray-800 leading-relaxed font-serif">
                        {block.stat.value}
                      </div>
                    </div>
                  );
                }

                // Active stat block — animated
                return (
                  <StatBlock
                    key={`active-${block.stat.label}`}
                    label={block.stat.label}
                    value={block.stat.value}
                    long={block.stat.long}
                    onDone={advanceBlock}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
