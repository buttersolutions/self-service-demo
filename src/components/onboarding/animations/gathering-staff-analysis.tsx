'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import type { ReviewInsight, ReviewAnalysis } from '@/lib/types';
import type { ReviewItem, ReviewProgressEvent } from '../types';
import { SquaresBackground } from './squares-background';

interface GatheringStaffAnalysisProps {
  mentions: ReviewInsight[];
  analysis: ReviewAnalysis | null;
  analysisPreview?: ReviewAnalysis | null;
  reviews?: ReviewItem[] | null;
  progress?: ReviewProgressEvent[];
  isActive?: boolean;
  onComplete?: () => void;
}

// ── Small UI pieces ─────────────────────────────────────────────────

// Adapted from reactbits.dev BlurText — words blur-deblur in one by one
function BlurText({
  text = '',
  delay = 150,
  className = '',
  direction = 'bottom',
  onAnimationComplete,
}: {
  text?: string;
  delay?: number;
  className?: string;
  direction?: 'top' | 'bottom';
  onAnimationComplete?: () => void;
}) {
  const words = useMemo(() => text.split(' '), [text]);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(ref.current as Element);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const from = useMemo(
    () =>
      direction === 'top'
        ? { filter: 'blur(10px)', opacity: 0, y: -30 }
        : { filter: 'blur(10px)', opacity: 0, y: 30 },
    [direction],
  );

  const to = useMemo(
    () => [
      { filter: 'blur(4px)', opacity: 0.6, y: direction === 'top' ? 4 : -4 },
      { filter: 'blur(0px)', opacity: 1, y: 0 },
    ],
    [direction],
  );

  const buildKeyframes = useCallback(
    (fromVal: Record<string, string | number>, steps: Record<string, string | number>[]) => {
      const keys = new Set([...Object.keys(fromVal), ...steps.flatMap((s) => Object.keys(s))]);
      const kf: Record<string, (string | number)[]> = {};
      keys.forEach((k) => {
        kf[k] = [fromVal[k], ...steps.map((s) => s[k])];
      });
      return kf;
    },
    [],
  );

  const keyframes = useMemo(() => buildKeyframes(from, to), [buildKeyframes, from, to]);

  return (
    <span ref={ref} className={className} style={{ display: 'flex', flexWrap: 'wrap' }}>
      {words.map((word, index) => {
        const transition: Transition = {
          duration: 0.5,
          times: [0, 0.5, 1],
          delay: (index * delay) / 1000,
        };

        return (
          <motion.span
            key={index}
            initial={from}
            animate={inView ? keyframes : from}
            transition={transition}
            onAnimationComplete={index === words.length - 1 ? onAnimationComplete : undefined}
            style={{ display: 'inline-block', willChange: 'transform, filter, opacity' }}
          >
            {word}
            {index < words.length - 1 && '\u00A0'}
          </motion.span>
        );
      })}
    </span>
  );
}



const AVATAR_COLORS = [
  { bg: '#C4F0D5', text: '#1B7A3D' },
  { bg: '#D8DAF9', text: '#3F3ABF' },
  { bg: '#F2C4E0', text: '#9B2D6B' },
  { bg: '#BEF5EF', text: '#1A7A6D' },
  { bg: '#FDE6C4', text: '#8B5E1A' },
  { bg: '#C4DEF0', text: '#1A5E8B' },
];

const CARD_ROTATIONS = [-1.5, 1, -0.8, 1.2, -1, 0.6];

function ReviewCard({
  insight,
  delayMs,
  cardIndex,
  module,
}: {
  insight: ReviewInsight;
  delayMs: number;
  cardIndex: number;
  module: string;
}) {
  const rotate = CARD_ROTATIONS[cardIndex % CARD_ROTATIONS.length];
  const displayText = insight.relevantExcerpt.length > 180
    ? insight.relevantExcerpt.slice(0, 180) + '...'
    : insight.relevantExcerpt;

  const author = (insight.reviewAuthor && insight.reviewAuthor !== 'undefined')
    ? insight.reviewAuthor
    : 'Anonymous';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: rotate * 3, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, rotate, scale: 1 }}
      transition={{ delay: delayMs / 1000, type: 'spring', stiffness: 260, damping: 20 }}
      className="relative bg-white rounded-2xl p-4 border border-gray-100 min-w-[320px] max-w-[320px] shrink-0 flex flex-col"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03)' }}
    >
      {/* Category badge — top right */}
      <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 text-[11px] font-sans font-medium px-2 py-0.5 rounded-md bg-white border border-gray-200 shadow-sm text-gray-600 capitalize">
        <span className={`size-1.5 rounded-full ${MODULE_DOT_COLORS[module] ?? 'bg-gray-400'}`} />
        {insight.category.replace(/-/g, ' ')}
      </span>

      <div className="flex items-center gap-2.5 mb-2 pr-24">
        <div
          className="size-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
          style={{
            backgroundColor: AVATAR_COLORS[cardIndex % AVATAR_COLORS.length].bg,
            color: AVATAR_COLORS[cardIndex % AVATAR_COLORS.length].text,
            border: '0.5px solid rgba(0,0,0,0.1)',
          }}
        >
          {author.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium text-gray-700 block truncate">
            {author}
          </span>
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-gray-500 line-clamp-6 mb-4">
        &ldquo;{displayText}&rdquo;
      </p>
      <div className="flex items-center gap-1 mt-auto pt-3 border-t border-gray-50">
        <svg viewBox="0 0 24 24" className="size-3 opacity-50" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span className="text-[10px] text-gray-400 font-medium">Google</span>
      </div>
    </motion.div>
  );
}


function AnalysisResults({
  analysis,
  mentions,
  sortedBreakdown,
  onScrollStart,
  onComplete,
}: {
  analysis: ReviewAnalysis;
  mentions: ReviewInsight[];
  sortedBreakdown: ReviewAnalysis['categoryBreakdown'];
  onScrollStart: () => void;
  onComplete?: () => void;
}) {
  const strengthsText = `Customers love ${analysis.strengths.slice(0, 3).map((s) => s.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' and $1')}. These are your strongest areas.`;
  const areasIntroText = 'However, we found areas that need attention:';

  // Steps: 0=headline, 1=strengths, 2=areasIntro, 3=1st section (immediate),
  //         4=start scroll + wait 3.5s, 5=2nd section + wait 3.5s, 6=3rd section, ..., last=summary
  const [step, setStep] = useState(0);
  const sectionCount = sortedBreakdown.length;
  const firstSectionStep = 3;
  const summaryStep = firstSectionStep + sectionCount;

  // 0 → 1: headline done
  const onHeadlineDone = useCallback(() => setStep(1), []);
  // 1 → 2: strengths done
  const onStrengthsDone = useCallback(() => setStep(2), []);
  // 2 → 3: areas intro done → show 1st section immediately
  const onAreasIntroDone = useCallback(() => setStep(3), []);

  // 3: 1st section visible → wait for cards to land (~4s), start scroll, then show next section
  useEffect(() => {
    if (step !== firstSectionStep) return;
    // Start scroll after all 3 cards in first section have landed (3 * 1200ms + buffer)
    const scrollTimer = setTimeout(() => onScrollStart(), 4000);
    // Show next section 3.5s after scroll starts
    const nextTimer = setTimeout(() => setStep((s) => s + 1), 7500);
    return () => { clearTimeout(scrollTimer); clearTimeout(nextTimer); };
  }, [step, onScrollStart]);

  // 4+: each subsequent section waits 3.5s then shows next
  useEffect(() => {
    if (step <= firstSectionStep || step >= firstSectionStep + sectionCount) return;
    const t = setTimeout(() => setStep((s) => s + 1), 3500);
    return () => clearTimeout(t);
  }, [step, sectionCount]);

  // After all sections shown, wait 2s then show summary
  useEffect(() => {
    if (step !== firstSectionStep + sectionCount) return;
    const t = setTimeout(() => setStep(summaryStep), 2000);
    return () => clearTimeout(t);
  }, [step, sectionCount, summaryStep]);

  // Auto-navigate to last step 8s after summary is shown
  useEffect(() => {
    if (step !== summaryStep) return;
    const t = setTimeout(() => onComplete?.(), 8000);
    return () => clearTimeout(t);
  }, [step, summaryStep, onComplete]);

  const visibleSections = Math.max(0, step - firstSectionStep + 1); // 1 at step 3, 2 at step 4, etc.

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative z-10 px-12 pt-24 pb-[50vh]"
    >
      {/* 1. Headline */}
      <div className="mb-8">
        <BlurText
          text={analysis.headline}
          delay={120}
          direction="bottom"
          className="text-3xl font-light text-gray-800 leading-relaxed font-serif"
          onAnimationComplete={onHeadlineDone}
        />
      </div>

      {/* 2. Strengths — after headline done */}
      {step >= 1 && analysis.strengths.length > 0 && (
        <motion.div
          className="mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <BlurText
            text={strengthsText}
            delay={60}
            direction="bottom"
            className="text-lg text-gray-600 leading-relaxed font-serif"
            onAnimationComplete={onStrengthsDone}
          />
        </motion.div>
      )}

      {/* 3. "However..." — after strengths done */}
      {step >= 2 && sortedBreakdown.length > 0 && (
        <div className="mb-10">
          <motion.div
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <BlurText
              text={areasIntroText}
              delay={60}
              direction="bottom"
              className="text-lg text-gray-600 font-serif"
              onAnimationComplete={onAreasIntroDone}
            />
          </motion.div>

          {/* 5-7. Review sections — revealed one by one */}
          <div className="space-y-14">
            {sortedBreakdown.map((breakdown, i) => {
              if (i >= visibleSections) return null;
              const relevantInsights = mentions
                .filter((m) => m.category === breakdown.category && m.sentiment === 'negative')
                .slice(0, 3);
              return (
                <motion.div
                  key={breakdown.category}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-base text-gray-600 mb-8 font-serif">
                    <strong className="text-gray-700 capitalize">
                      {breakdown.category.replace(/-/g, ' ')}
                    </strong>
                    {' '}
                    <span className="text-gray-400">
                      ({breakdown.count >= 10
                        ? <>{breakdown.count} mentions</>
                        : <>{Math.round(breakdown.percentage)}% of negative feedback</>
                      })
                    </span>
                    <span className="ml-2 inline-flex items-center gap-1.5 text-xs font-sans font-medium px-2.5 py-0.5 rounded-md bg-white border border-gray-200 shadow-sm text-gray-700 align-middle">
                      <span className={`size-1.5 rounded-full ${MODULE_DOT_COLORS[breakdown.allgravyModule] ?? 'bg-gray-400'}`} />
                      {breakdown.allgravyModule}
                    </span>
                  </p>
                  <div className="flex gap-4 flex-wrap">
                    {relevantInsights.map((insight, j) => (
                      <ReviewCard
                        key={j}
                        insight={insight}
                        delayMs={j * 1200}
                        cardIndex={i * 3 + j}
                        module={breakdown.allgravyModule}
                      />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* 8. Closing summary — after all sections shown */}
      {step >= summaryStep && analysis.body && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <BlurText
            text={analysis.body}
            delay={60}
            direction="bottom"
            className="text-lg font-light text-gray-500 leading-relaxed font-serif"
          />
        </motion.div>
      )}
    </motion.div>
  );
}

const MODULE_DOT_COLORS: Record<string, string> = {
  'Chat & Newsfeed': 'bg-blue-500',
  "To-Do's & Handbooks": 'bg-amber-500',
  'Learning & Development': 'bg-emerald-500',
  'Compliance & Safety': 'bg-red-500',
  'People & HRIS': 'bg-violet-500',
};

// ── Main component ──────────────────────────────────────────────────

export function GatheringStaffAnalysis({ mentions, analysis, onComplete }: GatheringStaffAnalysisProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const isDataReady = analysis !== null;

  // Called by AnalysisResults when it's time to start scrolling
  const startScroll = useCallback(() => {
    if (scrollingRef.current) return;
    scrollingRef.current = true;
    const scroll = () => {
      if (!scrollingRef.current || !scrollRef.current) return;
      const s = scrollRef.current;
      // Only scroll if there's content below the fold
      if (s.scrollTop + s.clientHeight < s.scrollHeight - 2) {
        s.scrollTop += 0.2;
      }
      // Keep the loop running — new content will appear over time
      rafRef.current = requestAnimationFrame(scroll);
    };
    rafRef.current = requestAnimationFrame(scroll);
  }, []);

  useEffect(() => {
    return () => {
      scrollingRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const isEmpty = isDataReady && mentions.length === 0 && !analysis.headline;
  const sortedBreakdown = analysis?.categoryBreakdown
    ?.filter((c) => c.sentiment !== 'mostly-positive')
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3) ?? [];

  return (
    <div
      ref={scrollRef}
      className="w-full h-full overflow-y-auto overflow-x-hidden relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      {/* Loading — waiting for analysis data */}
      <AnimatePresence>
        {!isDataReady && (
          <motion.div
            className="absolute inset-0 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SquaresBackground
              direction="diagonal"
              speed={0.3}
              borderColor="rgba(98, 92, 228, 0.08)"
              squareSize={40}
              hoverFillColor="rgba(98, 92, 228, 0.04)"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8" style={{ paddingLeft: 280 }}>
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

                <motion.p
                  className="text-sm text-gray-400"
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  This may take a moment...
                </motion.p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      <AnimatePresence>
        {isDataReady && isEmpty && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="text-sm text-gray-400">No operational insights found</span>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDataReady && !isEmpty && analysis && (
          <AnalysisResults
            analysis={analysis}
            mentions={mentions}
            sortedBreakdown={sortedBreakdown}
            onScrollStart={startScroll}
            onComplete={onComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
