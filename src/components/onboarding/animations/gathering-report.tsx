'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CompanyInsight } from '@/lib/saber';
import type { WaterfallCompany, WaterfallPerson } from '@/lib/waterfall';
import { SquaresBackground } from './squares-background';

interface GatheringReportProps {
  insights: CompanyInsight[] | null;
  company: WaterfallCompany | null;
  persons: WaterfallPerson[] | null;
  businessName: string;
  isActive: boolean;
  onComplete?: () => void;
}

interface StatLine {
  label: string;
  value: string;
  long?: boolean;
}

function buildStats(
  company: WaterfallCompany | null,
  persons: WaterfallPerson[] | null,
  insights: CompanyInsight[] | null,
): StatLine[] {
  const stats: StatLine[] = [];

  if (company?.industry) {
    stats.push({ label: 'Industry', value: company.industry });
  }
  if (company?.employees_count) {
    stats.push({ label: 'Team Size', value: `${company.employees_count.toLocaleString()} employees` });
  }
  if (company?.founded) {
    const years = new Date().getFullYear() - company.founded;
    stats.push({ label: 'Founded', value: `${company.founded} — ${years} years in business` });
  }
  if (company?.city && company?.country) {
    stats.push({ label: 'Headquarters', value: `${company.city}, ${company.country}` });
  }
  if (company?.funding_total && company.funding_total > 0) {
    const formatted = company.funding_total >= 1_000_000
      ? `$${(company.funding_total / 1_000_000).toFixed(1)}M raised`
      : `$${company.funding_total.toLocaleString()} raised`;
    stats.push({ label: 'Funding', value: formatted });
  }
  if (company?.linkedin_followers && company.linkedin_followers > 0) {
    stats.push({ label: 'LinkedIn', value: `${company.linkedin_followers.toLocaleString()} followers` });
  }
  if (persons && persons.length > 0) {
    stats.push({ label: 'Contacts', value: `${persons.length} key people identified` });
  }
  if (company?.description) {
    stats.push({ label: 'About', value: company.description, long: true });
  }
  if (insights) {
    for (const insight of insights) {
      if (!insight.answer || insight.error) continue;
      let value: string;
      if (Array.isArray(insight.answer)) {
        value = insight.answer.join(', ');
      } else {
        value = String(insight.answer);
      }
      stats.push({ label: insight.label, value, long: value.length > 100 });
    }
  }
  return stats;
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

export function GatheringReport({
  insights,
  company,
  persons,
  businessName,
  isActive,
  onComplete,
}: GatheringReportProps) {
  const [phase, setPhase] = useState<'loading' | 'stats'>('loading');
  const [revealedIndex, setRevealedIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const stats = buildStats(company, persons, insights);
  const isDataReady = insights !== null && company !== null;

  // When all data arrives, transition from loading to stats
  useEffect(() => {
    if (!isActive || !isDataReady || phase !== 'loading') return;
    const timer = setTimeout(() => setPhase('stats'), 800);
    return () => clearTimeout(timer);
  }, [isActive, isDataReady, phase]);

  // Advance to the next block
  const advanceBlock = useCallback(() => {
    setRevealedIndex((prev) => prev + 1);
  }, []);

  // Fire onComplete 3 seconds after all stats have been revealed
  useEffect(() => {
    if (stats.length === 0 || revealedIndex < stats.length) return;
    if (completedRef.current) return;

    const timer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [revealedIndex, stats.length, onComplete]);

  // Start slow auto-scroll after a few blocks
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

  useEffect(() => {
    return () => {
      scrollingRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

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
                  Gathering business intelligence
                </h2>
              </div>
              <p className="text-sm text-gray-400">
                Analyzing {businessName}...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sequential reveal of stats */}
      <AnimatePresence>
        {phase === 'stats' && stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative z-10 px-12 pt-20 space-y-10"
            style={{ paddingBottom: '40vh' }}
          >
            <div className="space-y-8">
              {stats.map((stat, i) => {
                if (i > revealedIndex) return null;

                const isActiveBlock = i === revealedIndex;

                if (!isActiveBlock) {
                  return (
                    <div key={`done-${stat.label}`}>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#625CE4]/60 mb-1">
                        {stat.label}
                      </div>
                      <div className="text-2xl font-light text-gray-800 leading-relaxed font-serif">
                        {stat.value}
                      </div>
                    </div>
                  );
                }

                return (
                  <StatBlock
                    key={`active-${stat.label}`}
                    label={stat.label}
                    value={stat.value}
                    long={stat.long}
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
