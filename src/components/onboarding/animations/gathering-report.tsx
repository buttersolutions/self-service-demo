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

function TypewriterText({ text, delay = 0, speed = 25, onProgress }: { text: string; delay?: number; speed?: number; onProgress?: () => void }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
        if (i % 5 === 0) onProgress?.();
      } else {
        clearInterval(interval);
        onProgress?.();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [started, text, speed, onProgress]);

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

export function GatheringReport({
  insights,
  company,
  persons,
  businessName,
  isActive,
  onComplete,
}: GatheringReportProps) {
  const [phase, setPhase] = useState<'loading' | 'stats' | 'done'>('loading');
  const scrollRef = useRef<HTMLDivElement>(null);
  const statsEndRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const stats = buildStats(company, persons, insights);
  const isDataReady = insights !== null && company !== null;

  const handleTypewriterProgress = useCallback(() => {
    statsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // When all data arrives, transition from loading to stats
  useEffect(() => {
    if (!isActive || !isDataReady || phase !== 'loading') return;
    // Small delay so the transition feels intentional
    const timer = setTimeout(() => setPhase('stats'), 800);
    return () => clearTimeout(timer);
  }, [isActive, isDataReady, phase]);

  // After stats have been shown for a while, auto-navigate to next step
  useEffect(() => {
    if (phase !== 'stats' || completedRef.current) return;

    // Estimate how long the typewriter animations will take
    const totalStatDelay = stats.length * 0.4 * 1000 + 2000;
    const longestTypewriter = stats.reduce((max, s) => {
      if (s.long) return max; // long stats use reveal, not typewriter
      return Math.max(max, s.value.length * 25);
    }, 0);
    const waitMs = Math.max(totalStatDelay + longestTypewriter, 8000);

    const timer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        setPhase('done');
        onComplete?.();
      }
    }, waitMs);

    return () => clearTimeout(timer);
  }, [phase, stats, onComplete]);

  // Scroll when stats appear
  useEffect(() => {
    if (phase !== 'stats') return;
    const timer = setTimeout(() => {
      statsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return () => clearTimeout(timer);
  }, [phase]);

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

      {/* Loading state — header with pulsing dot */}
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

      {/* Stats — shown after data loads */}
      <AnimatePresence>
        {(phase === 'stats' || phase === 'done') && stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative z-10 px-12 pt-20 space-y-10"
            style={{ paddingBottom: '40vh' }}
          >
            <div className="space-y-8">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.4, duration: 0.5 }}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#625CE4]/60 mb-1">
                    {stat.label}
                  </div>
                  <div className="text-2xl font-light text-gray-800 leading-relaxed font-serif">
                    {stat.long ? (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: (0.2 + i * 0.4) + 0.2, duration: 0.8 }}
                        onAnimationComplete={handleTypewriterProgress}
                      >
                        {stat.value}
                      </motion.span>
                    ) : (
                      <TypewriterText
                        text={stat.value}
                        delay={(0.2 + i * 0.4) * 1000 + 200}
                        onProgress={handleTypewriterProgress}
                      />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            <div ref={statsEndRef} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
