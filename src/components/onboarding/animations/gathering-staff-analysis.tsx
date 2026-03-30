'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ThumbsUp, ThumbsDown, TrendingUp, AlertTriangle, Loader2, Search } from 'lucide-react';
import type { ReviewInsight, ReviewAnalysis, CategoryBreakdown } from '@/lib/types';
import type { ReviewItem, ReviewProgressEvent } from '../types';

interface GatheringStaffAnalysisProps {
  mentions: ReviewInsight[];
  analysis: ReviewAnalysis | null;
  analysisPreview: ReviewAnalysis | null;
  reviews: ReviewItem[] | null;
  progress: ReviewProgressEvent[];
  isActive: boolean;
  onComplete?: () => void;
}

// ── Small UI pieces ─────────────────────────────────────────────────

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

function ProgressCard({ text, icon }: { text: string; icon: 'search' | 'insight' | 'loading' }) {
  const Icon = icon === 'search' ? Search : icon === 'insight' ? TrendingUp : Loader2;
  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-gray-100 shadow-sm"
    >
      <div className="size-8 rounded-lg bg-[#625CE4]/10 flex items-center justify-center shrink-0">
        <Icon className={`size-4 text-[#625CE4] ${icon === 'loading' ? 'animate-spin' : ''}`} />
      </div>
      <span className="text-sm text-gray-700">{text}</span>
    </motion.div>
  );
}

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

function StrengthCard({ strength, quote, index }: { strength: string; quote?: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.4 }}
      className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <ThumbsUp className="size-4 text-emerald-600" />
        <span className="text-sm font-semibold text-emerald-800">{strength}</span>
      </div>
      {quote && (
        <p className="text-xs text-emerald-700/70 italic leading-relaxed">
          &ldquo;{quote}&rdquo;
        </p>
      )}
    </motion.div>
  );
}

function IssueCard({ breakdown, insights, index }: { breakdown: CategoryBreakdown; insights: ReviewInsight[]; index: number }) {
  const relevantInsights = insights
    .filter((i) => i.category === breakdown.category && i.sentiment === 'negative')
    .slice(0, 2);

  const countDisplay = breakdown.count >= 10
    ? `${breakdown.count} reviews`
    : `${Math.round(breakdown.percentage)}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.4 }}
      className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-900 capitalize">
            {breakdown.category.replace(/-/g, ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#625CE4]/10 text-[#625CE4]">
            {breakdown.allgravyModule}
          </span>
          <span className="text-lg font-bold text-gray-900">{countDisplay}</span>
        </div>
      </div>

      <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-amber-400"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(breakdown.percentage, 100)}%` }}
          transition={{ delay: index * 0.15 + 0.3, duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {relevantInsights.length > 0 && (
        <div className="space-y-2">
          {relevantInsights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="size-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-500 shrink-0 mt-0.5">
                {(insight.reviewAuthor ?? '?').charAt(0).toUpperCase()}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed italic">
                &ldquo;{insight.relevantExcerpt}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Review card for the initial reviews phase ───────────────────────

function ReviewCard({ review, index }: { review: ReviewItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28, delay: index * 0.15 }}
      className="bg-white rounded-2xl p-4 border border-gray-100"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03)' }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0">
          {(review.author ?? '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium text-gray-700 block truncate">
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
      <p className="text-[13px] leading-relaxed text-gray-500 line-clamp-3">
        {review.text}
      </p>
    </motion.div>
  );
}

// ── Main component ──────────────────────────────────────────────────

type Phase = 'reviews' | 'analyzing' | 'results';

export function GatheringStaffAnalysis({ mentions, analysis, analysisPreview, reviews, progress, isActive, onComplete }: GatheringStaffAnalysisProps) {
  const [phase, setPhase] = useState<Phase>('reviews');
  const scrollRef = useRef<HTMLDivElement>(null);
  const completeCalledRef = useRef(false);
  const mountedAtRef = useRef(Date.now());
  const [visibleReviewCount, setVisibleReviewCount] = useState(0);

  const isDataReady = analysis !== null;
  const reviewList = reviews ?? [];

  // Phase 1 → 2: Show review cards for 6s, then collapse into analyzing
  useEffect(() => {
    if (phase !== 'reviews' || !isActive) return;
    const timer = setTimeout(() => setPhase('analyzing'), 6000);
    return () => clearTimeout(timer);
  }, [phase, isActive]);

  // Stagger review card reveals during phase 1
  useEffect(() => {
    if (phase !== 'reviews' || !isActive) return;
    const max = Math.min(reviewList.length, 6);
    if (visibleReviewCount >= max) return;
    const timer = setTimeout(() => {
      setVisibleReviewCount((prev) => prev + 1);
    }, visibleReviewCount === 0 ? 300 : 800);
    return () => clearTimeout(timer);
  }, [phase, isActive, visibleReviewCount, reviewList.length]);

  // Phase 2 → 3: Transition to results when final analysis arrives
  useEffect(() => {
    if (phase !== 'analyzing' || !isDataReady) return;
    // Small delay so the last progress cards are visible
    const timer = setTimeout(() => setPhase('results'), 800);
    return () => clearTimeout(timer);
  }, [phase, isDataReady]);

  // If analysis arrives while still in reviews phase, go to analyzing first (don't skip)
  useEffect(() => {
    if (phase !== 'reviews' || !isDataReady) return;
    // Data arrived fast — still show reviews for a bit, then go through analyzing briefly
    const elapsed = Date.now() - mountedAtRef.current;
    const remaining = Math.max(0, 4000 - elapsed);
    const timer = setTimeout(() => setPhase('analyzing'), remaining);
    return () => clearTimeout(timer);
  }, [phase, isDataReady]);

  // Preview data from incremental Sonnet merges
  const previewHeadline = analysisPreview?.headline;
  const previewStrengths = analysisPreview?.strengths ?? [];
  const previewOpportunities = analysisPreview?.opportunities ?? [];

  // Build progress messages
  const progressMessages = React.useMemo(() => {
    const msgs: Array<{ text: string; icon: 'search' | 'insight' | 'loading' }> = [];
    const byLocation = new Map<string, ReviewProgressEvent>();
    for (const p of progress) {
      byLocation.set(p.placeId, p);
    }
    for (const p of byLocation.values()) {
      msgs.push({ text: `Collected ${p.reviewCount} reviews from ${p.displayName}`, icon: 'search' });
    }
    if (mentions.length > 0) {
      const categories = new Set(mentions.map((m) => m.category));
      msgs.push({ text: `Found ${mentions.length} insights across ${categories.size} categories`, icon: 'insight' });
    }
    if (progress.length > 0 && !analysis) {
      msgs.push({ text: 'Running analysis...', icon: 'loading' });
    }
    return msgs;
  }, [progress, mentions, analysis]);

  const isEmpty = isDataReady && mentions.length === 0 && !analysis.headline;
  const positiveInsights = mentions.filter((m) => m.sentiment === 'positive');
  const sortedBreakdown = analysis?.categoryBreakdown
    ?.filter((c) => c.sentiment !== 'mostly-positive')
    .sort((a, b) => b.percentage - a.percentage) ?? [];

  return (
    <div
      ref={scrollRef}
      className="w-full h-full overflow-y-auto overflow-x-hidden relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      {/* ── Phase 1: Review Cards ────────────────────────────────── */}
      <AnimatePresence>
        {phase === 'reviews' && (
          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8"
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
          >
            <motion.h2
              className="text-xl font-light text-gray-800 font-serif tracking-tight mb-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              Reading your reviews...
            </motion.h2>
            <div className="w-full max-w-lg space-y-3">
              <AnimatePresence>
                {reviewList.slice(0, visibleReviewCount).map((review, i) => (
                  <ReviewCard key={`review-${i}`} review={review} index={0} />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phase 2: Analyzing (progress cards + preview) ────────── */}
      <AnimatePresence>
        {phase === 'analyzing' && (
          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div className="w-full max-w-md">
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  className="size-2.5 rounded-full bg-[#625CE4]"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <h2 className="text-xl font-light text-gray-800 font-serif tracking-tight">
                  Analysing reviews
                </h2>
              </div>

              {/* Preview headline from incremental merges */}
              <AnimatePresence mode="wait">
                {previewHeadline && (
                  <motion.div
                    key={previewHeadline}
                    className="mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 shadow-sm"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="text-lg font-serif text-gray-800 leading-snug mb-2">
                      {previewHeadline}
                    </div>
                    {previewStrengths.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {previewStrengths.map((s, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    {previewOpportunities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {previewOpportunities.map((o, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                            {o}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Live progress cards */}
              <div className="space-y-2">
                {progressMessages.map((msg, i) => (
                  <ProgressCard key={`${msg.text}-${i}`} text={msg.text} icon={msg.icon} />
                ))}
                {progressMessages.length === 0 && !previewHeadline && (
                  <ProgressCard text="Connecting to review sources..." icon="loading" />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phase 3: Results ─────────────────────────────────────── */}
      <AnimatePresence>
        {phase === 'results' && isEmpty && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="text-sm text-gray-400">No operational insights found</span>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'results' && !isEmpty && analysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 px-12 pt-16 pb-[40vh]"
          >
            {/* Headline */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-3xl font-light text-gray-800 leading-relaxed font-serif">
                <TypewriterText text={analysis.headline} speed={25} />
              </div>
            </motion.div>

            {/* Strengths */}
            {analysis.strengths.length > 0 && (
              <motion.div
                className="mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.4 }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 mb-3">
                  What customers love
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {analysis.strengths.map((strength, i) => {
                    const matchingInsight = positiveInsights.find((ins) =>
                      ins.relevantExcerpt.toLowerCase().includes(strength.toLowerCase().split(' ')[0])
                    );
                    return (
                      <StrengthCard
                        key={strength}
                        strength={strength}
                        quote={matchingInsight?.relevantExcerpt}
                        index={i}
                      />
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Issues */}
            {sortedBreakdown.length > 0 && (
              <motion.div
                className="mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5, duration: 0.4 }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 mb-3">
                  Areas for improvement
                </div>
                <div className="grid gap-3">
                  {sortedBreakdown.map((breakdown, i) => (
                    <IssueCard
                      key={breakdown.category}
                      breakdown={breakdown}
                      insights={mentions}
                      index={i}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Body summary */}
            {analysis.body && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3.5, duration: 0.5 }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#625CE4]/60 mb-2">
                  Summary
                </div>
                <p className="text-lg font-light text-gray-600 leading-relaxed font-serif">
                  {analysis.body}
                </p>
              </motion.div>
            )}

            {/* Stats bar */}
            <motion.div
              className="flex items-center gap-6 mt-8 pt-6 border-t border-gray-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 4, duration: 0.4 }}
            >
              <div>
                <div className="text-2xl font-bold text-gray-900">{analysis.totalReviewsAnalyzed}</div>
                <div className="text-xs text-gray-400">reviews analyzed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{analysis.positiveCount}</div>
                <div className="text-xs text-gray-400">positive</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-500">{analysis.negativeCount}</div>
                <div className="text-xs text-gray-400">needs attention</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#625CE4]">{analysis.categoryBreakdown.length}</div>
                <div className="text-xs text-gray-400">areas identified</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
